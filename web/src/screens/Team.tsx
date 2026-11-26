import { useState } from 'react';
import { blockTotals, dayTotals, reviewsOn } from '../lib/api';
import { addDays, clock, rangeLabel, shortDay, todayISO, weekDays, weekStart } from '../lib/dates';
import { go, useLoad } from '../lib/hooks';
import { mostMissed, pct, score, sumTotals } from '../lib/stats';
import type { Profile, Team } from '../lib/types';
import { Arrows, Avatar, Header, Loading, Problem, Ribbon, Segmented } from '../components/bits';

const canSee = (p: Profile, me: Profile) => p.id === me.id || p.share_progress === true;

export function TeamScreen({ me, team, people, view }: { me: Profile; team: Team; people: Profile[]; view: 'day' | 'week' }) {
  return (
    <>
      <Header title={team.name} sub={`${people.length} ${people.length === 1 ? 'person' : 'people'}`} />
      <Segmented
        label="Show"
        value={view}
        onChange={(v) => go(v === 'week' ? '/team/week' : '/team')}
        options={[
          { value: 'day', label: 'Today' },
          { value: 'week', label: 'Week' },
        ]}
      />
      {view === 'day' ? <TeamToday me={me} people={people} /> : <TeamWeek me={me} people={people} />}
      <Invite team={team} />
    </>
  );
}

function TeamToday({ me, people }: { me: Profile; people: Profile[] }) {
  const today = todayISO();
  const ids = people.map((p) => p.id);
  const { data, error, reload } = useLoad(
    async () => {
      const [days, blocks, reviews] = await Promise.all([dayTotals(ids, today, today), blockTotals(ids, today, today), reviewsOn(ids, today)]);
      return { days, blocks, reviews };
    },
    [ids.join(','), today],
  );
  if (error) return <Problem text={error} retry={reload} />;
  if (!data) return <Loading />;
  return (
    <ul className="people">
      {people.map((p) => {
        const day = data.days.find((d) => d.user_id === p.id);
        const blocks = data.blocks.filter((b) => b.user_id === p.id);
        const review = data.reviews.find((r) => r.user_id === p.id);
        const line = review?.missed.split('\n')[0] || review?.tomorrow.split('\n')[0] || '';
        const visible = canSee(p, me);
        const status = !visible ? 'Keeps their days private' : !day || !day.total ? 'Nothing yet today' : `Updated ${clock(day.updated_at)}`;
        const body = (
          <>
            <div className="person-head">
              <Avatar person={p} />
              <div className="person-name">
                <b>{p.id === me.id ? `${p.name || 'Me'} (you)` : p.name || 'No name yet'}</b>
                <small>{status}</small>
              </div>
              {visible && day && day.total > 0 && (
                <span className="person-count">
                  {day.done} of {day.total}
                </span>
              )}
            </div>
            {visible && <Ribbon blocks={blocks} colour={p.colour} />}
            {visible && line && <p className="person-line">{line}</p>}
          </>
        );
        return (
          <li key={p.id} className="person">
            {visible ? <a href={`#/p/${p.id}/day/${today}`}>{body}</a> : <div>{body}</div>}
          </li>
        );
      })}
    </ul>
  );
}

function TeamWeek({ me, people }: { me: Profile; people: Profile[] }) {
  const [anchor, setAnchor] = useState(todayISO());
  const days = weekDays(anchor);
  const from = days[0];
  const to = days[6];
  const ids = people.filter((p) => canSee(p, me)).map((p) => p.id);
  const { data, error, reload } = useLoad(async () => {
    const [totals, blocks] = await Promise.all([dayTotals(ids, from, to), blockTotals(ids, from, to)]);
    return { totals, blocks };
  }, [ids.join(','), from]);
  const thisWeek = weekStart(todayISO()) === from;

  return (
    <section className="week">
      <div className="range-head">
        <h2>{thisWeek ? 'This week' : rangeLabel(from, to)}</h2>
        <Arrows label="Change week" onPrev={() => setAnchor(addDays(from, -7))} onNext={() => setAnchor(addDays(from, 7))} nextDisabled={thisWeek} />
      </div>
      {error && <Problem text={error} retry={reload} />}
      {!error && !data && <Loading />}
      {data && (
        <>
          <div className="grid-scroll">
            <table className="week-grid">
              <thead>
                <tr>
                  <th scope="col">
                    <span className="sr">Person</span>
                  </th>
                  {days.map((d) => (
                    <th key={d} scope="col">
                      {shortDay(d).split(' ')[0].slice(0, 1)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {people.filter((p) => canSee(p, me)).map((p) => (
                  <tr key={p.id}>
                    <th scope="row">
                      <a href={`#/p/${p.id}/week/${from}`}>{p.id === me.id ? 'You' : p.name || 'No name'}</a>
                    </th>
                    {days.map((d) => {
                      const t = data.totals.find((x) => x.user_id === p.id && x.date === d);
                      const s = t ? score(t) : 0;
                      return (
                        <td key={d}>
                          <a
                            href={`#/p/${p.id}/day/${d}`}
                            className="cell"
                            style={t && t.total ? { background: p.colour, opacity: 0.18 + s * 0.82 } : undefined}
                            aria-label={t ? `${shortDay(d)}: ${t.done} of ${t.total}` : `${shortDay(d)}: no record`}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <WeekSummary totals={data.totals} blocks={data.blocks} who="the team's" />
          {people.some((p) => !canSee(p, me)) && <p className="quiet">People who keep their days private are not counted.</p>}
        </>
      )}
    </section>
  );
}

export function WeekSummary({ totals, blocks, who }: { totals: { total: number; done: number; half: number }[]; blocks: Parameters<typeof mostMissed>[0]; who: string }) {
  const sum = sumTotals(totals);
  if (!sum.total) return <p className="quiet">No tasks recorded in this period.</p>;
  const missed = mostMissed(blocks);
  return (
    <div className="summary">
      <p className="big">{pct(score(sum))}%</p>
      <p>
        of {who} tasks done{sum.half ? ', half-done ones counted as half' : ''}.
        {missed && (
          <>
            {' '}
            <b>{missed}</b> is the block most often missed.
          </>
        )}
      </p>
    </div>
  );
}

function Invite({ team }: { team: Team }) {
  const link = `${window.location.origin}/?join=${team.invite_code}`;
  const [copied, setCopied] = useState<'no' | 'yes' | 'failed'>('no');
  return (
    <section className="invite">
      <h2>Invite someone</h2>
      <p className="quiet">Anyone with this link can join {team.name} after signing in.</p>
      <div className="invite-row">
        <code>{link}</code>
        <button
          className="btn"
          onClick={() =>
            navigator.clipboard
              .writeText(link)
              .then(() => setCopied('yes'))
              .catch(() => setCopied('failed'))
          }
        >
          {copied === 'yes' ? 'Copied' : 'Copy'}
        </button>
      </div>
      {copied === 'failed' && <p className="problem-line">Could not copy. Select the link and copy it.</p>}
    </section>
  );
}

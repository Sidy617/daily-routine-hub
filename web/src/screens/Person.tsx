import { blockTotals, dayTotals, getWeekGoals, readDay } from '../lib/api';
import { addDays, addMonths, dayLabel, monthGrid, monthLabel, monthStart, rangeLabel, shortDay, todayISO, weekDays, weekStart } from '../lib/dates';
import { go, useLoad } from '../lib/hooks';
import { activeDays, score } from '../lib/stats';
import type { Profile } from '../lib/types';
import { Arrows, Avatar, Header, Loading, Problem, Segmented } from '../components/bits';
import { countDone, DayView } from '../components/DayView';
import { WeekSummary } from './Team';

type View = 'day' | 'week' | 'month';

/** Anyone's records: day, week or month. Read only; my own day is edited on Today. */
export function Person({ me, person, view, date }: { me: Profile; person: Profile; view: View; date?: string }) {
  const at = date ?? todayISO();
  const mine = person.id === me.id;
  const visible = mine || person.share_progress === true;
  const base = `/p/${person.id}`;
  return (
    <>
      <Header
        title={mine ? 'My records' : person.name || 'No name yet'}
        sub={visible ? 'Every day is kept.' : 'Keeps their days private.'}
        right={<Avatar person={person} />}
      />
      {visible && (
        <>
          <Segmented
            label="Show"
            value={view}
            onChange={(v) => go(`${base}/${v}/${at}`)}
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
            ]}
          />
          {view === 'day' && <PersonDay me={me} person={person} date={at} base={base} />}
          {view === 'week' && <PersonWeek person={person} date={at} base={base} />}
          {view === 'month' && <PersonMonth person={person} date={at} base={base} />}
        </>
      )}
    </>
  );
}

function PersonDay({ me, person, date, base }: { me: Profile; person: Profile; date: string; base: string }) {
  const { data, error, reload } = useLoad(async () => ({ full: await readDay(person.id, date) }), [person.id, date]);
  return (
    <section>
      <div className="range-head">
        <h2>{dayLabel(date)}</h2>
        <Arrows label="Change day" onPrev={() => go(`${base}/day/${addDays(date, -1)}`)} onNext={() => go(`${base}/day/${addDays(date, 1)}`)} />
      </div>
      {error && <Problem text={error} retry={reload} />}
      {!error && !data && <Loading />}
      {data && !data.full && <p className="quiet">Nothing was recorded on this day.</p>}
      {data?.full && (
        <>
          <p className="progress">
            <b>
              {countDone(data.full.tasks).done} of {data.full.tasks.length}
            </b>{' '}
            done
            {person.id === me.id && (
              <>
                {' '}
                <a className="link" href={`#/day/${date}`}>
                  Edit this day
                </a>
              </>
            )}
          </p>
          <DayView full={data.full} editable={false} onChange={() => undefined} />
        </>
      )}
    </section>
  );
}

function PersonWeek({ person, date, base }: { person: Profile; date: string; base: string }) {
  const days = weekDays(date);
  const from = days[0];
  const to = days[6];
  const { data, error, reload } = useLoad(async () => {
    const [totals, blocks, goals] = await Promise.all([dayTotals([person.id], from, to), blockTotals([person.id], from, to), getWeekGoals(person.id, from)]);
    return { totals, blocks, goals };
  }, [person.id, from]);
  const thisWeek = weekStart(todayISO()) === from;
  return (
    <section>
      <div className="range-head">
        <h2>{thisWeek ? 'This week' : rangeLabel(from, to)}</h2>
        <Arrows
          label="Change week"
          onPrev={() => go(`${base}/week/${addDays(from, -7)}`)}
          onNext={() => go(`${base}/week/${addDays(from, 7)}`)}
          nextDisabled={thisWeek}
        />
      </div>
      {error && <Problem text={error} retry={reload} />}
      {!error && !data && <Loading />}
      {data && (
        <>
          <ul className="day-bars">
            {days.map((d) => {
              const t = data.totals.find((x) => x.date === d);
              return (
                <li key={d}>
                  <a href={`#${base}/day/${d}`}>
                    <span className="day-name">{shortDay(d)}</span>
                    <span className="bar">
                      {t && t.total > 0 && <i style={{ width: `${Math.round(score(t) * 100)}%`, background: person.colour }} />}
                    </span>
                    <span className="day-count">{t && t.total ? `${t.done} of ${t.total}` : 'None'}</span>
                  </a>
                </li>
              );
            })}
          </ul>
          <WeekSummary totals={data.totals} blocks={data.blocks} who="the" />
          <p className="quiet">
            {activeDays(data.totals)} of 7 days with tasks done.
          </p>
          {data.goals && (
            <div className="review-read">
              <h3>Goals for this week</h3>
              <p>{data.goals}</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function PersonMonth({ person, date, base }: { person: Profile; date: string; base: string }) {
  const first = monthStart(date);
  const grid = monthGrid(first);
  const last = grid.flat().filter(Boolean).pop() as string;
  const { data, error, reload } = useLoad(async () => {
    const [totals, blocks] = await Promise.all([dayTotals([person.id], first, last), blockTotals([person.id], first, last)]);
    return { totals, blocks };
  }, [person.id, first]);
  const thisMonth = monthStart(todayISO()) === first;
  return (
    <section>
      <div className="range-head">
        <h2>{monthLabel(first)}</h2>
        <Arrows
          label="Change month"
          onPrev={() => go(`${base}/month/${addMonths(first, -1)}`)}
          onNext={() => go(`${base}/month/${addMonths(first, 1)}`)}
          nextDisabled={thisMonth}
        />
      </div>
      {error && <Problem text={error} retry={reload} />}
      {!error && !data && <Loading />}
      {data && (
        <>
          <div className="month" role="grid" aria-label={monthLabel(first)}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <span key={i} className="month-head" aria-hidden="true">
                {d}
              </span>
            ))}
            {grid.flat().map((d, i) => {
              if (!d) return <span key={i} />;
              const t = data.totals.find((x) => x.date === d);
              const s = t && t.total ? score(t) : null;
              return (
                <a
                  key={d}
                  href={`#${base}/day/${d}`}
                  className={`month-cell${d === todayISO() ? ' today' : ''}`}
                  aria-label={t ? `${dayLabel(d)}: ${t.done} of ${t.total}` : `${dayLabel(d)}: no record`}
                >
                  {s !== null && <i style={{ background: person.colour, opacity: 0.18 + s * 0.82 }} />}
                  <span>{Number(d.slice(8))}</span>
                </a>
              );
            })}
          </div>
          <WeekSummary totals={data.totals} blocks={data.blocks} who="the" />
          <p className="quiet">{activeDays(data.totals)} days with tasks done.</p>
        </>
      )}
    </section>
  );
}

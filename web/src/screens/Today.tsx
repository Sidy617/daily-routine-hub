import { useState } from 'react';
import { getWeekGoals, openMyDay, readDay, saveWeekGoals } from '../lib/api';
import { addDays, dayLabel, isSunday, todayISO, weekStart } from '../lib/dates';
import { go, useAutosave, useLoad } from '../lib/hooks';
import type { FullDay, Profile } from '../lib/types';
import { Arrows, Avatar, Header, Loading, Problem, SaveState } from '../components/bits';
import { countDone, DayView } from '../components/DayView';
import { ShareButton } from '../components/ShareCard';

/** My day. A past day with no record is never made up: it shows as empty until I add it. */
export function Today({ me, date }: { me: Profile; date?: string }) {
  const today = todayISO();
  const day = date ?? today;
  const isPast = day < today;
  const [adding, setAdding] = useState(false);
  const [addFailed, setAddFailed] = useState(false);
  // data === null while loading; data.full === null when a past day has no record.
  const { data, error, reload, setData } = useLoad<{ full: FullDay | null }>(
    async () => ({ full: isPast ? await readDay(me.id, day) : await openMyDay(day) }),
    [day, me.id],
  );
  const full = data?.full ?? null;

  const title = day === today ? 'Today' : day === addDays(today, 1) ? 'Tomorrow' : day === addDays(today, -1) ? 'Yesterday' : dayLabel(day);

  async function addThisDay() {
    setAdding(true);
    setAddFailed(false);
    try {
      setData({ full: await openMyDay(day) });
    } catch {
      setAddFailed(true);
    } finally {
      setAdding(false);
    }
  }

  return (
    <>
      <Header
        title={title}
        sub={
          day === today ? (
            dayLabel(day)
          ) : (
            <>
              {title !== dayLabel(day) && <>{dayLabel(day)}. </>}
              <a href="#/" className="link">
                Back to today
              </a>
            </>
          )
        }
        right={
          <>
            <Arrows label="Change day" onPrev={() => go(`/day/${addDays(day, -1)}`)} onNext={() => go(`/day/${addDays(day, 1)}`)} />
            <a href="#/me" aria-label="Me" className="head-avatar">
              <Avatar person={me} />
            </a>
          </>
        }
      />
      {error && <Problem text={error} retry={reload} />}
      {!error && !data && <Loading />}
      {data && !full && (
        <div className="empty">
          <p>Nothing was recorded on this day.</p>
          <button className="btn" onClick={addThisDay} disabled={adding}>
            Add this day
          </button>
          {addFailed && <p className="problem-line">Not added. Check your connection.</p>}
        </div>
      )}
      {full && (
        <>
          <div className="progress-row">
            <p className="progress">
              <b>
                {countDone(full.tasks).done} of {full.tasks.length}
              </b>{' '}
              done
            </p>
            <div className="row-actions">
              <a className="btn" href={`#/p/${me.id}/week/${day}`}>
                Week
              </a>
              <ShareButton full={full} person={me} />
            </div>
          </div>
          {isSunday(day) && <NextWeek me={me} sunday={day} />}
          <DayView full={full} editable onChange={(next) => setData({ full: next })} />
        </>
      )}
    </>
  );
}

function NextWeek({ me, sunday }: { me: Profile; sunday: string }) {
  const week = weekStart(addDays(sunday, 1));
  const { data } = useLoad(() => getWeekGoals(me.id, week), [week, me.id]);
  const [value, setValue] = useState<string | null>(null);
  const { state, push } = useAutosave((v) => saveWeekGoals(me.id, week, v));
  return (
    <section className="sunday">
      <div className="field-head">
        <h2>Next week's three goals</h2>
        <SaveState state={state} />
      </div>
      <textarea
        aria-label="Next week's three goals"
        value={value ?? data ?? ''}
        rows={3}
        maxLength={2000}
        onChange={(e) => {
          setValue(e.target.value);
          push(e.target.value);
        }}
      />
    </section>
  );
}

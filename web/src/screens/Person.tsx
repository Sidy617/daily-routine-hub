import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Flame, Lock } from 'lucide-react';
import { blockTotals, dayTotals, getMonthGoals, getWeekGoals, linesOn, readDay } from '@/lib/api';
import { KIND_LABEL } from '@/lib/board';

import { addDays, addMonths, clock, dayLabel, monthGrid, monthLabel, monthStart, rangeLabel, shortDay, todayISO, weekDays, weekStart } from '@/lib/dates';
import { personStyle } from '@/lib/colours';
import { go, useLoad } from '@/lib/hooks';
import { pct, score, streak, sumTotals } from '@/lib/stats';
import type { Profile } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { BlockCard, doneCount } from '@/components/Day';
import { Screen, stagger } from '@/components/Screen';
import { GlassTabs, GlassTabsList, GlassTabsTrigger } from '@/components/ui/glass-tabs';
import { WeekSummary } from './Team';

type View = 'day' | 'week' | 'month';

/** Anyone's records: day, week or month. Read only; my own day is changed on Today. */
export function Person({ me, person, view, date }: { me: Profile; person: Profile; view: View; date?: string }) {
  const at = date ?? todayISO();
  const mine = person.id === me.id;
  const visible = mine || person.share_progress === true;
  const base = `/p/${person.id}`;
  const today = todayISO();
  const stats = useLoad(async () => (visible ? dayTotals([person.id], addDays(today, -90), today) : []), [person.id, visible, today]);
  const week = (stats.data ?? []).filter((r) => r.date >= weekStart(today));
  const run = stats.data ? streak(stats.data, today, addDays) : null;

  return (
    <Screen>
      <a href={mine ? '#/me' : '#/team'} className="-ml-1.5 inline-flex w-fit items-center gap-0.5 rounded-full py-1 pr-2 text-body font-medium text-tint">
        <ChevronLeft className="size-5" /> {mine ? 'Me' : 'Team'}
      </a>

      <header className="relative flex flex-col items-center pt-1 text-center">
        <span aria-hidden className="absolute top-0 size-36 rounded-full opacity-55 blur-3xl" style={{ background: person.colour }} />
        <motion.span initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
          <Avatar person={person} size={96} className="relative shadow-[0_12px_30px_-12px_rgb(0_0_0/0.45)] ring-4 ring-[var(--glass-strong)]" />
        </motion.span>
        <h1 className="title-case relative mt-3 font-display text-title font-bold">{mine ? 'My records' : person.name || 'No name yet'}</h1>
        {person.focus && <p className="relative text-sub text-ink-2">{person.focus}</p>}
        {visible && stats.data && (
          <div className="relative mt-3 flex gap-2">
            <span className="glass rounded-full px-3 py-1.5 text-sub">
              <span className="font-semibold">{pct(score(sumTotals(week)))}%</span> <span className="text-ink-2">this week</span>
            </span>
            <span className="glass inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-sub">
              <Flame className="size-4 text-tint" />
              <span className="font-semibold">{run}</span> <span className="text-ink-2">{run === 1 ? 'day' : 'days'} in a row</span>
            </span>
          </div>
        )}
      </header>

      {!visible ? (
        <>
          <div className="glass flex items-center gap-3 rounded-card p-4">
            <Lock className="size-5 text-ink-2" />
            <p className="text-body text-ink-2">{person.name} keeps their days private.</p>
          </div>
          <Lines person={person} date={at} />
        </>
      ) : (
        <>
          <GlassTabs value={view} onValueChange={(v) => go(`${base}/${v}/${at}`)}>
            <GlassTabsList className="w-full">
              <GlassTabsTrigger value="day">Day</GlassTabsTrigger>
              <GlassTabsTrigger value="week">Week</GlassTabsTrigger>
              <GlassTabsTrigger value="month">Month</GlassTabsTrigger>
            </GlassTabsList>
          </GlassTabs>
          {view === 'day' && <PersonDay me={me} person={person} date={at} base={base} />}
          {view === 'week' && <PersonWeek person={person} date={at} base={base} />}
          {view === 'month' && <PersonMonth person={person} date={at} base={base} />}
        </>
      )}
    </Screen>
  );
}

function Pager({ label, onPrev, onNext, nextDisabled }: { label: string; onPrev: () => void; onNext: () => void; nextDisabled?: boolean }) {
  return (
    <div className="glass flex items-center justify-between rounded-full p-1">
      <button type="button" aria-label="Earlier" onClick={onPrev} className="grid size-9 place-items-center rounded-full text-tint hover:bg-fill">
        <ChevronLeft className="size-5" />
      </button>
      <span className="title-case text-body font-semibold">{label}</span>
      <button type="button" aria-label="Later" disabled={nextDisabled} onClick={onNext} className="grid size-9 place-items-center rounded-full text-tint hover:bg-fill disabled:text-ink-3">
        <ChevronRight className="size-5" />
      </button>
    </div>
  );
}

function PersonDay({ me, person, date, base }: { me: Profile; person: Profile; date: string; base: string }) {
  const { data } = useLoad(async () => ({ full: await readDay(person.id, date) }), [person.id, date]);
  const full = data?.full;
  return (
    <motion.div variants={stagger.container} initial="initial" animate="animate" className="flex flex-col gap-3">
      <Pager label={dayLabel(date)} onPrev={() => go(`${base}/day/${addDays(date, -1)}`)} onNext={() => go(`${base}/day/${addDays(date, 1)}`)} />
      <Lines person={person} date={date} />
      {data && !full && <p className="px-4 py-6 text-center text-sub text-ink-2">Nothing was recorded on this day.</p>}
      {full && (
        <>
          <p className="px-1 text-sub text-ink-2">
            <span className="font-semibold text-ink">
              {doneCount(full.tasks)} of {full.tasks.length}
            </span>{' '}
            done
            {person.id === me.id && (
              <a href={date === todayISO() ? '#/' : `#/day/${date}`} className="ml-2 font-semibold text-tint">
                Edit this day
              </a>
            )}
          </p>
          {full.blocks.map((b) => (
            <BlockCard key={b.id} block={b} tasks={full.tasks.filter((t) => t.day_block_id === b.id)} editable={false} />
          ))}
          {(full.day.missed || full.day.fix || full.day.tomorrow) && (
            <motion.section variants={stagger.item} className="glass space-y-3 rounded-card p-4">
              <h2 className="title-case text-head font-semibold">Evening review</h2>
              {(
                [
                  ["What didn't happen", full.day.missed],
                  ['The fix', full.day.fix],
                  ["Tomorrow's top three", full.day.tomorrow],
                ] as const
              )
                .filter(([, v]) => v)
                .map(([q, a]) => (
                  <div key={q}>
                    <p className="label-case text-sub font-semibold text-tint">{q}</p>
                    <p className="whitespace-pre-wrap text-body">{a}</p>
                  </div>
                ))}
            </motion.section>
          )}
        </>
      )}
    </motion.div>
  );
}

function PersonWeek({ person, date, base }: { person: Profile; date: string; base: string }) {
  const days = weekDays(date);
  const from = days[0];
  const to = days[6];
  const { data } = useLoad(async () => {
    const [totals, blocks, goals] = await Promise.all([dayTotals([person.id], from, to), blockTotals([person.id], from, to), getWeekGoals(person.id, from)]);
    return { totals, blocks, goals };
  }, [person.id, from]);
  const thisWeek = weekStart(todayISO()) === from;
  return (
    <motion.div variants={stagger.container} initial="initial" animate="animate" className="flex flex-col gap-3">
      <Pager label={thisWeek ? 'This week' : rangeLabel(from, to)} onPrev={() => go(`${base}/week/${addDays(from, -7)}`)} onNext={() => go(`${base}/week/${addDays(from, 7)}`)} nextDisabled={thisWeek} />
      <motion.ul variants={stagger.item} className="glass divide-y divide-line overflow-hidden rounded-card">
        {days.map((d) => {
          const t = data?.totals.find((x) => x.date === d);
          return (
            <li key={d}>
              <a href={`#${base}/day/${d}`} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 hover:bg-fill/60">
                <span className={d === todayISO() ? 'text-body font-semibold text-tint' : 'text-body font-medium'}>{shortDay(d)}</span>
                <span className="person-colour h-2 overflow-hidden rounded-full bg-fill" style={personStyle(person.colour)}>
                  {t && t.total > 0 && (
                    <motion.span
                      className="block h-full rounded-full"
                      style={{ background: 'var(--mark)' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(score(t) * 100)}%` }}
                      transition={{ type: 'spring', stiffness: 80, damping: 18 }}
                    />
                  )}
                </span>
                <span className="tabular text-sub text-ink-2">{t && t.total ? `${t.done}/${t.total}` : '-'}</span>
              </a>
            </li>
          );
        })}
      </motion.ul>
      {data && <WeekSummary totals={data.totals} blocks={data.blocks} who="the" />}
      {data?.goals && (
        <motion.section variants={stagger.item} className="glass rounded-card p-4">
          <p className="label-case text-sub font-semibold text-tint">Goals for this week</p>
          <p className="mt-1 whitespace-pre-wrap text-body">{data.goals}</p>
        </motion.section>
      )}
    </motion.div>
  );
}

function PersonMonth({ person, date, base }: { person: Profile; date: string; base: string }) {
  const first = monthStart(date);
  const grid = monthGrid(first);
  const flat = grid.flat().filter(Boolean) as string[];
  const { data } = useLoad(async () => {
    const [totals, blocks, goals] = await Promise.all([
      dayTotals([person.id], flat[0], flat[flat.length - 1]),
      blockTotals([person.id], flat[0], flat[flat.length - 1]),
      getMonthGoals(person.id, first),
    ]);
    return { totals, blocks, goals };
  }, [person.id, first]);
  const thisMonth = monthStart(todayISO()) === first;
  return (
    <motion.div variants={stagger.container} initial="initial" animate="animate" className="flex flex-col gap-3">
      <Pager label={monthLabel(first)} onPrev={() => go(`${base}/month/${addMonths(first, -1)}`)} onNext={() => go(`${base}/month/${addMonths(first, 1)}`)} nextDisabled={thisMonth} />
      <motion.section variants={stagger.item} className="glass rounded-card p-3">
        <div className="grid grid-cols-7 gap-1.5">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <span key={i} className="pb-1 text-center text-cap font-semibold text-ink-2">
              {d}
            </span>
          ))}
          {grid.flat().map((d, i) => {
            if (!d) return <span key={i} />;
            const t = data?.totals.find((x) => x.date === d);
            const s = t && t.total ? score(t) : null;
            return (
              <a
                key={d}
                href={`#${base}/day/${d}`}
                aria-label={t ? `${dayLabel(d)}: ${t.done} of ${t.total}` : `${dayLabel(d)}: no record`}
                className={`person-colour tabular grid aspect-square place-items-center rounded-[10px] text-sub font-semibold transition-transform hover:scale-105 ${d === todayISO() ? 'ring-2 ring-tint' : ''}`}
                style={personStyle(person.colour, { background: s !== null ? `color-mix(in srgb, var(--heat) ${Math.round(18 + s * 44)}%, transparent)` : 'var(--fill)' })}
              >
                {Number(d.slice(8))}
              </a>
            );
          })}
        </div>
      </motion.section>
      {data && <WeekSummary totals={data.totals} blocks={data.blocks} who="the" />}
      {data?.goals && (
        <motion.section variants={stagger.item} className="glass rounded-card p-4">
          <p className="label-case text-sub font-semibold text-tint">Goals for {thisMonth ? 'this month' : monthLabel(first)}</p>
          <p className="mt-1 whitespace-pre-wrap text-body">{data.goals}</p>
        </motion.section>
      )}
    </motion.div>
  );
}

/** What they posted to the Board that day. The team sees these even when the day itself is private. */
function Lines({ person, date }: { person: Profile; date: string }) {
  const { data } = useLoad(async () => linesOn(person.id, date), [person.id, date]);
  if (!data?.length) return null;
  return (
    <motion.section variants={stagger.item} className="glass divide-y divide-line overflow-hidden rounded-card">
      {data.map((p) => (
        <a key={p.id} href="#/team/board" className="block px-4 py-3 hover:bg-fill/60">
          <span className="label-case block text-sub font-medium text-ink-2">
            {p.kind === 'reply' ? 'Reply' : KIND_LABEL[p.kind]}, {clock(p.created_at)}
          </span>
          <span className="block whitespace-pre-wrap text-body">{p.body}</span>
        </a>
      ))}
    </motion.section>
  );
}

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, ChevronRight, Flag, HandHeart, Moon, Plus, RotateCcw, Target, X } from 'lucide-react';
import { bringOver, getMonthGoals, getWeekGoals, linesOn, openMyDay, readDay, saveMonthGoals, saveWeekGoals, unfinishedOn, updateTask } from '@/lib/api';
import { KIND_LABEL, kindForHour } from '@/lib/board';
import { addDays, dayLabel, isSunday, monthLabel, monthStart, rangeLabel, todayISO, weekStart } from '@/lib/dates';
import { useLoad } from '@/lib/hooks';
import { blockNow } from '@/lib/now';
import type { FullDay, Post, Profile, Task, Team } from '@/lib/types';
import { rem } from '@/lib/utils';
import { Avatar } from '@/components/Avatar';
import { BlockCard, NowCard } from '@/components/Day';
import { AddSheet, AutoField, ReviewSheet, TaskSheet } from '@/components/DaySheets';
import { DateMenu } from '@/components/DateMenu';
import { LargeTitle, Screen, stagger } from '@/components/Screen';
import { PostSheet } from '@/components/Board';
import { Segment } from '@/components/Segment';
import { ShareButton } from '@/components/ShareCard';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';

const NEXT: Record<Task['status'], Task['status']> = { todo: 'done', half: 'done', done: 'todo' };

/** My day. A past day with no record is never made up: it shows as empty until I add it. */
export function Today({ me, team, people, date }: { me: Profile; team: Team; people: Profile[]; date?: string }) {
  const today = todayISO();
  const day = date ?? today;
  const isToday = day === today;
  const isPast = day < today;
  const { data, error, reload, setData } = useLoad<{ full: FullDay | null }>(
    async () => ({ full: isPast ? await readDay(me.id, day) : await openMyDay(day) }),
    [day, me.id],
  );
  const full = data?.full ?? null;
  const setFull = (f: FullDay) => setData({ full: f });

  const [adding, setAdding] = useState<{ blockId?: string } | null>(null);
  const [editing, setEditing] = useState<Task | null>(null);
  const [review, setReview] = useState(false);
  const [goals, setGoals] = useState(false);
  const [creating, setCreating] = useState(false);
  const [writing, setWriting] = useState<{ edit?: Post } | null>(null);
  const lines = useLoad(async () => (isToday ? linesOn(me.id, day) : []), [isToday, me.id, day]);

  // The "+" beside the tab bar asks this screen to open the quick add.
  useEffect(() => {
    const on = () => full && setAdding({});
    window.addEventListener('routine:add', on);
    return () => window.removeEventListener('routine:add', on);
  }, [full]);

  // Yesterday's unfinished tasks, offered once on today.
  const carry = useLoad(async () => (isToday ? unfinishedOn(me.id, addDays(today, -1)) : []), [isToday, me.id, today]);
  const [carryGone, setCarryGone] = useState(false);
  const carryItems =
    full && carry.data ? carry.data.filter((u) => !full.tasks.some((t) => t.text.trim().toLowerCase() === u.text.trim().toLowerCase())) : [];

  async function toggle(t: Task) {
    if (!full) return;
    const status = NEXT[t.status];
    const before = full;
    setFull({ ...full, tasks: full.tasks.map((x) => (x.id === t.id ? { ...x, status } : x)) });
    try {
      await updateTask(t.id, { status });
    } catch {
      setFull(before);
      toast('That change did not save. Check your connection.', true);
    }
  }

  async function bring() {
    if (!full) return;
    try {
      const added = await bringOver(full, carryItems);
      setFull({ ...full, tasks: [...full.tasks, ...added] });
      toast(`Brought ${added.length} over from yesterday`);
      setCarryGone(true);
    } catch {
      toast('Not brought over. Check your connection.', true);
    }
  }

  async function addThisDay() {
    setCreating(true);
    try {
      setFull(await openMyDay(day));
    } catch {
      toast('Not added. Check your connection.', true);
    } finally {
      setCreating(false);
    }
  }

  const relative = isToday ? 'Today' : day === addDays(today, -1) ? 'Yesterday' : day === addDays(today, 1) ? 'Tomorrow' : null;
  const nowIndex = full && isToday ? blockNow(full.blocks).current : -1;

  return (
    <Screen>
      <LargeTitle
        eyebrow={relative ? dayLabel(day) : 'Your day'}
        title={
          <DateMenu meId={me.id} date={day}>
            {relative ?? dayLabel(day)}
          </DateMenu>
        }
        right={
          <>
            {!isToday && (
              <Button variant="glass" size="sm" asChild>
                <a href="#/">Today</a>
              </Button>
            )}
            {full && <ShareButton full={full} person={me} />}
            <a href="#/me" aria-label="Me" className="rounded-full">
              <Avatar person={me} size={40} />
            </a>
          </>
        }
      />

      {error && (
        <div className="glass rounded-card p-4">
          <p className="text-body">{error}</p>
          <Button variant="plain" size="bare" className="mt-2" onClick={reload}>
            Try again
          </Button>
        </div>
      )}
      {!error && !data && <Skeleton />}

      {data && !full && (
        <div className="glass flex flex-col items-start gap-3 rounded-card p-5">
          <p className="text-head font-semibold">Nothing was recorded on {dayLabel(day)}</p>
          <p className="text-sub text-ink-2">Add the day if you want to fill it in now.</p>
          <Button variant="tint" onClick={addThisDay} disabled={creating}>
            Add this day
          </Button>
        </div>
      )}

      {full && (
        <motion.div variants={stagger.container} initial="initial" animate="animate" className="flex flex-col gap-3">
          {isToday && <NowCard full={full} />}

          {isToday && carryItems.length > 0 && !carryGone && (
            <motion.section variants={stagger.item} className="glass flex items-center gap-3 rounded-card p-3 pl-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-fill text-tint">
                <RotateCcw className="size-[1.125rem]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-semibold">
                  {carryItems.length} unfinished from yesterday
                </span>
                <span className="block truncate text-sub text-ink-2">{carryItems.map((c) => c.text).join(', ')}</span>
              </span>
              <Button variant="tint" size="sm" onClick={bring}>
                Bring over
              </Button>
              <button type="button" aria-label="Not now" onClick={() => setCarryGone(true)} className="grid size-8 place-items-center rounded-full text-ink-2 hover:bg-fill">
                <X className="size-4" />
              </button>
            </motion.section>
          )}

          {isToday && <LinesCard lines={lines.data ?? []} onWrite={() => setWriting({})} onOpen={(p) => setWriting({ edit: p })} />}

          {isToday && <GoalsRow me={me} onClick={() => setGoals(true)} />}

          {!full.blocks.length && (
            <motion.section variants={stagger.item} className="glass flex flex-col items-start gap-3 rounded-card p-5">
              <p className="text-head font-semibold">Your day has no blocks yet</p>
              <p className="text-sub text-ink-2">Blocks are the parts of your day, like Study or Build.</p>
              <Button variant="tint" asChild>
                <a href="#/me/day">Shape my day</a>
              </Button>
            </motion.section>
          )}

          {full.blocks.map((b, i) => (
            <BlockCard
              key={b.id}
              block={b}
              tasks={full.tasks.filter((t) => t.day_block_id === b.id)}
              isNow={i === nowIndex}
              editable
              onToggle={toggle}
              onOpen={setEditing}
              onAdd={() => setAdding({ blockId: b.id })}
            />
          ))}

          {full.blocks.length > 0 && (
            <OpenRow
              icon={<Moon className="size-[1.125rem]" />}
              title="Evening review"
              sub={full.day.missed || full.day.fix || full.day.tomorrow ? (full.day.tomorrow || full.day.missed || full.day.fix).split('\n')[0] : 'How did today go?'}
              onClick={() => setReview(true)}
            />
          )}
        </motion.div>
      )}

      {full && (
        <>
          <AddSheet
            open={!!adding}
            onOpenChange={(o) => !o && setAdding(null)}
            full={full}
            blockId={adding?.blockId}
            onAdded={(t) => setFull({ ...full, tasks: [...full.tasks, t] })}
          />
          <TaskSheet
            task={editing}
            onClose={() => setEditing(null)}
            onSaved={(t) => setFull({ ...full, tasks: full.tasks.map((x) => (x.id === t.id ? t : x)) })}
            onDeleted={(id) => setFull({ ...full, tasks: full.tasks.filter((x) => x.id !== id) })}
          />
          <ReviewSheet open={review} onOpenChange={setReview} full={full} onChange={setFull} />
          <GoalsSheet open={goals} onOpenChange={setGoals} me={me} day={day} />
          <PostSheet
            open={!!writing}
            onOpenChange={(o) => !o && setWriting(null)}
            me={me}
            team={team}
            people={people}
            topics={[]}
            edit={writing?.edit}
            onSaved={() => lines.reload()}
          />
        </>
      )}
    </Screen>
  );
}

function OpenRow({ icon, title, sub, onClick }: { icon: React.ReactNode; title: string; sub: string; onClick: () => void }) {
  return (
    <motion.button variants={stagger.item} type="button" onClick={onClick} whileTap={{ scale: 0.985 }} className="glass flex w-full items-center gap-3 rounded-card p-3 pl-4 text-left">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-fill text-tint">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="title-case block text-body font-semibold">{title}</span>
        <span className="block truncate text-sub text-ink-2">{sub}</span>
      </span>
      <ChevronRight className="size-[1.125rem] text-ink-3" />
    </motion.button>
  );
}

/** My lines for today, as the team sees them on the Board. Mornings ask for an aim, evenings for what I learned. */
function LinesCard({ lines, onWrite, onOpen }: { lines: Post[]; onWrite: () => void; onOpen: (p: Post) => void }) {
  const ask = kindForHour(new Date().getHours());
  if (!lines.length)
    return (
      <OpenRow
        icon={ask === 'aim' ? <Target className="size-[1.125rem]" /> : <BookOpen className="size-[1.125rem]" />}
        title={ask === 'aim' ? "Today's aim" : 'What I learned'}
        sub="Shared with your team on the Board"
        onClick={onWrite}
      />
    );
  const Icon = { aim: Target, learned: BookOpen, cheer: HandHeart, reply: Target };
  return (
    <motion.section variants={stagger.item} className="glass overflow-hidden rounded-card">
      <ul className="divide-y divide-line">
        {lines.map((p) => {
          const I = Icon[p.kind];
          return (
            <li key={p.id}>
              <button type="button" onClick={() => onOpen(p)} className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-fill/60 active:bg-fill">
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-fill text-tint">
                  <I className="size-[1.125rem]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="label-case block text-sub font-medium text-ink-2">{p.kind === 'reply' ? 'Reply' : KIND_LABEL[p.kind]}</span>
                  <span className="line-clamp-3 block text-body">{p.body}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={onWrite} className="flex h-11 w-full items-center gap-2 border-t border-line px-4 text-body font-semibold text-tint hover:bg-fill/60">
        <Plus className="size-[1.125rem]" /> {ask === 'aim' ? 'Add a line' : 'What I learned'}
      </button>
    </motion.section>
  );
}

/** The week's and month's goals, in one row on Today. On Sundays the week means next week. */
function GoalsRow({ me, onClick }: { me: Profile; onClick: () => void }) {
  const today = todayISO();
  const week = isSunday(today) ? weekStart(addDays(today, 1)) : weekStart(today);
  const { data } = useLoad(async () => {
    const [w, m] = await Promise.all([getWeekGoals(me.id, week), getMonthGoals(me.id, monthStart(today))]);
    return { w, m };
  }, [me.id, week, today]);
  const first = (data?.w || data?.m || '').split('\n').find((l) => l.trim());
  return (
    <OpenRow
      icon={<Flag className="size-[1.125rem]" />}
      title="Goals"
      sub={first ?? (isSunday(today) ? "Set next week's goals" : 'This week and this month')}
      onClick={onClick}
    />
  );
}

function GoalsSheet({ open, onOpenChange, me, day }: { open: boolean; onOpenChange: (o: boolean) => void; me: Profile; day: string }) {
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  const sunday = isSunday(day);
  const week = sunday ? weekStart(addDays(day, 1)) : weekStart(day);
  const month = monthStart(day);
  const { data } = useLoad(async () => {
    if (!open) return null;
    const [w, m] = await Promise.all([getWeekGoals(me.id, week), getMonthGoals(me.id, month)]);
    return { w, m };
  }, [open, week, month, me.id]);
  const [local, setLocal] = useState<{ w?: string; m?: string }>({});
  useEffect(() => {
    if (open) setLocal({});
  }, [open]);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Goals"
      right={
        <Button variant="plain" size="bare" className="font-semibold" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      }
    >
      <div className="space-y-4 pb-2">
        <Segment
          label="Period"
          value={period}
          onChange={setPeriod}
          options={[
            { value: 'week', label: sunday ? 'Next week' : 'This week' },
            { value: 'month', label: 'This month' },
          ]}
        />
        {data &&
          (period === 'week' ? (
            <AutoField
              key="week"
              label={rangeLabel(week, addDays(week, 6))}
              placeholder="One per line"
              value={local.w ?? data.w}
              onLocal={(v) => setLocal({ ...local, w: v })}
              onSave={(v) => saveWeekGoals(me.id, week, v)}
              rows={5}
            />
          ) : (
            <AutoField
              key="month"
              label={monthLabel(month)}
              placeholder="One per line"
              value={local.m ?? data.m}
              onLocal={(v) => setLocal({ ...local, m: v })}
              onSave={(v) => saveMonthGoals(me.id, month, v)}
              rows={5}
            />
          ))}
        <p className="px-1 text-sub text-ink-2">Your team sees these when you share your days.</p>
      </div>
    </Sheet>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-3" aria-label="Loading" role="status">
      {[96, 150, 130].map((h, i) => (
        <div key={i} className="glass animate-pulse rounded-card" style={{ height: rem(h), animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  );
}

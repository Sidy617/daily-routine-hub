import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronRight, Moon, RotateCcw, Target, X } from 'lucide-react';
import { bringOver, getWeekGoals, openMyDay, readDay, saveWeekGoals, unfinishedOn, updateTask } from '@/lib/api';
import { addDays, dayLabel, isSunday, todayISO, weekStart } from '@/lib/dates';
import { useLoad } from '@/lib/hooks';
import { blockNow } from '@/lib/now';
import type { FullDay, Profile, Task } from '@/lib/types';
import { Avatar } from '@/components/Avatar';
import { BlockCard, NowCard } from '@/components/Day';
import { AddSheet, AutoField, ReviewSheet, TaskSheet } from '@/components/DaySheets';
import { DateMenu } from '@/components/DateMenu';
import { LargeTitle, Screen, stagger } from '@/components/Screen';
import { ShareButton } from '@/components/ShareCard';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { toast } from '@/components/ui/toast';

const NEXT: Record<Task['status'], Task['status']> = { todo: 'done', half: 'done', done: 'todo' };

/** My day. A past day with no record is never made up: it shows as empty until I add it. */
export function Today({ me, date }: { me: Profile; date?: string }) {
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
                <RotateCcw className="size-[18px]" />
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

          {isSunday(day) && (
            <OpenRow icon={<Target className="size-[18px]" />} title="Next week's goals" sub="Three things that would make it a good week" onClick={() => setGoals(true)} />
          )}

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
              icon={<Moon className="size-[18px]" />}
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
          <GoalsSheet open={goals} onOpenChange={setGoals} me={me} sunday={day} />
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
      <ChevronRight className="size-[18px] text-ink-3" />
    </motion.button>
  );
}

function GoalsSheet({ open, onOpenChange, me, sunday }: { open: boolean; onOpenChange: (o: boolean) => void; me: Profile; sunday: string }) {
  const week = weekStart(addDays(sunday, 1));
  const { data } = useLoad(async () => (open ? getWeekGoals(me.id, week) : ''), [open, week, me.id]);
  const [value, setValue] = useState<string | null>(null);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Next week's goals"
      right={
        <Button variant="plain" size="bare" className="font-semibold" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      }
    >
      <div className="pb-2">
        <AutoField label="Three goals" placeholder="One per line" value={value ?? data ?? ''} onLocal={setValue} onSave={(v) => saveWeekGoals(me.id, week, v)} rows={4} />
      </div>
    </Sheet>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-3" aria-label="Loading" role="status">
      {[96, 150, 130].map((h, i) => (
        <div key={i} className="glass animate-pulse rounded-card" style={{ height: h, animationDelay: `${i * 120}ms` }} />
      ))}
    </div>
  );
}

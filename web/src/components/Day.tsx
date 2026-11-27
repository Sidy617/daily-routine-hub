import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { hm } from '@/lib/dates';
import { blockNow, duration } from '@/lib/now';
import type { DayBlock, FullDay, Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Check } from './Check';
import { Ring } from './Ring';
import { stagger } from './Screen';

/** Re-renders every minute so "now" and "time left" stay true. */
export function useMinute() {
  const [, set] = useState(0);
  useEffect(() => {
    const t = window.setInterval(() => set((n) => n + 1), 30_000);
    return () => window.clearInterval(t);
  }, []);
}

export const doneCount = (tasks: Task[]) => tasks.filter((t) => t.status === 'done').length;

/** What is on now, how long is left, and the day's ring. Shown on today only. */
export function NowCard({ full }: { full: FullDay }) {
  useMinute();
  const { current, next, left, until } = blockNow(full.blocks);
  const done = doneCount(full.tasks);
  const total = full.tasks.length;
  const half = full.tasks.filter((t) => t.status === 'half').length;
  const cur = full.blocks[current];
  const nxt = full.blocks[next];
  const label = cur ? 'Now' : nxt ? 'Next' : 'Today';
  const title = cur?.name ?? nxt?.name ?? (total && done === total ? 'All done' : 'Rest');
  const line = cur ? `${duration(left)} left` : nxt ? `Starts in ${duration(until)}` : total ? `${done} of ${total} done` : 'No blocks today';
  return (
    <motion.section variants={stagger.item} className="glass flex items-center gap-4 rounded-card p-4">
      <Ring value={total ? (done + half / 2) / total : 0} size={66} stroke={6.5} label={`${done} of ${total} done`}>
        <span className="text-head font-semibold text-ink">
          {done}
          <span className="text-sub font-medium text-ink-2">/{total}</span>
        </span>
      </Ring>
      <div className="min-w-0 flex-1">
        <p className="label-case text-sub font-semibold text-tint">{label}</p>
        <p className="title-case truncate text-title font-semibold text-ink">{title}</p>
        <p className="text-sub text-ink-2">{line}</p>
      </div>
    </motion.section>
  );
}

/** One block of the day on glass: name, hours, and its tasks. */
export function BlockCard({
  block,
  tasks,
  isNow,
  editable,
  onToggle,
  onOpen,
  onAdd,
}: {
  block: DayBlock;
  tasks: Task[];
  isNow?: boolean;
  editable: boolean;
  onToggle?: (t: Task) => void;
  onOpen?: (t: Task) => void;
  onAdd?: () => void;
}) {
  const done = doneCount(tasks);
  return (
    <motion.section
      variants={stagger.item}
      className={cn('glass rounded-card px-4 pt-3.5 pb-1.5', isNow && 'ring-2 ring-tint/60 shadow-[0_0_0_7px_color-mix(in_srgb,var(--tint)_12%,transparent)]')}
    >
      <header className="flex items-center gap-2">
        <h2 className="title-case min-w-0 truncate text-head font-semibold text-ink">{block.name}</h2>
        {isNow && <span className="label-case rounded-full bg-tint-fill px-2 py-[3px] text-cap leading-none font-semibold text-tint-ink">Now</span>}
        <span className="tabular ml-auto text-sub text-ink-2">{tasks.length ? `${done}/${tasks.length}` : ''}</span>
        {editable && onAdd && (
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Add a task to ${block.name}`}
            className="-mr-2 grid size-8 place-items-center rounded-full text-ink-2 transition-colors hover:bg-fill hover:text-tint"
          >
            <Plus className="size-[1.125rem]" />
          </button>
        )}
      </header>
      <p className="tabular -mt-0.5 text-sub text-ink-2">
        {hm(block.starts)} to {hm(block.ends)}
      </p>
      <ul className="mt-1.5">
        <AnimatePresence initial={false}>
          {tasks.map((t) => (
            <motion.li
              key={t.id}
              layout="position"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className="relative flex items-start gap-1 before:absolute before:top-0 before:right-0 before:left-9 before:h-px before:bg-line first:before:hidden"
            >
              <Check status={t.status} label={t.text} onToggle={editable && onToggle ? () => onToggle(t) : undefined} />
              {editable && onOpen ? (
                <button type="button" onClick={() => onOpen(t)} className="min-h-10 flex-1 py-2 text-left">
                  <TaskText task={t} />
                </button>
              ) : (
                <div className="min-h-10 flex-1 py-2">
                  <TaskText task={t} />
                </div>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
        {!tasks.length && <li className="py-2.5 text-sub text-ink-2">{editable ? 'Nothing planned yet' : 'Nothing recorded'}</li>}
      </ul>
    </motion.section>
  );
}

function TaskText({ task }: { task: Task }) {
  return (
    <>
      <span className={cn('block text-body transition-colors', task.status === 'done' ? 'text-ink-2 line-through decoration-ink-2/50' : 'text-ink')}>{task.text}</span>
      {task.note && <span className="mt-0.5 block text-sub text-ink-2">{task.note}</span>}
    </>
  );
}

import { motion } from 'motion/react';
import type { Status } from '@/lib/types';
import { cn } from '@/lib/utils';

const WORD: Record<Status, string> = { todo: 'Not started', half: 'Half done', done: 'Done' };

/** A task's mark: an empty ring, half filled, or filled with a drawn tick. Springs when tapped. */
export function Check({ status, onToggle, label, className }: { status: Status; onToggle?: () => void; label: string; className?: string }) {
  const mark = (
    <svg viewBox="0 0 24 24" className="size-[23px]" aria-hidden="true">
      <circle cx="12" cy="12" r="10.25" fill="none" strokeWidth="1.6" className={status === 'todo' ? 'stroke-ink-3' : 'stroke-tint'} />
      {status === 'half' && <path d="M12 1.75a10.25 10.25 0 0 1 0 20.5z" className="fill-tint" />}
      {status === 'done' && (
        <>
          <motion.circle cx="12" cy="12" r="10.25" className="fill-tint" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 24 }} style={{ originX: '50%', originY: '50%' }} />
          <motion.path
            d="M7.4 12.4l3.1 3.1 6.1-6.6"
            fill="none"
            stroke="var(--tint-ink)"
            strokeWidth="2.1"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.28, delay: 0.06, ease: 'easeOut' }}
          />
        </>
      )}
    </svg>
  );
  if (!onToggle) {
    return (
      <span className={cn('grid size-10 shrink-0 place-items-center', className)} aria-label={`${label}: ${WORD[status]}`}>
        {mark}
      </span>
    );
  }
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.82 }}
      transition={{ type: 'spring', stiffness: 600, damping: 20 }}
      onClick={() => {
        navigator.vibrate?.(8);
        onToggle();
      }}
      className={cn('-ml-2 grid size-10 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-tint/50', className)}
      aria-label={`${label}: ${WORD[status]}. Tap to change.`}
    >
      {mark}
    </motion.button>
  );
}

import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

/** A screen's frame: comes in softly, leaves room for the floating tab bar on phones. */
export function Screen({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        'mx-auto flex w-full max-w-[680px] flex-col gap-5 px-4 pt-[calc(env(safe-area-inset-top,0px)+14px)] pb-40 lg:px-8 lg:pt-10 lg:pb-16',
        className,
      )}
    >
      {children}
    </motion.main>
  );
}

/** The big title of a screen, with a small line above it and actions on the right. */
export function LargeTitle({ eyebrow, title, right }: { eyebrow?: ReactNode; title: ReactNode; right?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-3 pt-1">
      <div className="min-w-0">
        {eyebrow && <p className="label-case mb-0.5 truncate text-sub font-medium text-ink-2">{eyebrow}</p>}
        <h1 className="title-case truncate font-display text-large font-bold text-ink">{title}</h1>
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </header>
  );
}

/** Children slide up one after another. */
export const stagger = {
  container: { animate: { transition: { staggerChildren: 0.04 } } },
  item: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 380, damping: 32 } },
  },
};

import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, CircleAlert } from 'lucide-react';

type Note = { id: number; text: string; bad?: boolean };
let push: ((n: Note) => void) | null = null;
let seq = 0;

/** A short glass notice at the top, like an iOS banner. */
export function toast(text: string, bad = false) {
  push?.({ id: ++seq, text, bad });
}

export function Toaster() {
  const [notes, setNotes] = useState<Note[]>([]);
  useEffect(() => {
    push = (n) => {
      setNotes((all) => [...all.slice(-2), n]);
      window.setTimeout(() => setNotes((all) => all.filter((x) => x.id !== n.id)), n.bad ? 4200 : 2200);
    };
    return () => {
      push = null;
    };
  }, []);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 top-[max(env(safe-area-inset-top),12px)] z-[60] flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {notes.map((n) => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, y: -16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            className="glass-strong flex items-center gap-2 rounded-full py-2 pr-4 pl-3 text-sub font-medium text-ink"
          >
            {n.bad ? <CircleAlert className="size-4 text-danger" /> : <Check className="size-4 text-success" />}
            {n.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

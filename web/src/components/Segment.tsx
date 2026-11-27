import { useId } from 'react';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

/** A small segmented control; the selection glides between options. */
export function Segment<T extends string>({
  value,
  options,
  onChange,
  label,
  className,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  const id = useId();
  return (
    <div role="radiogroup" aria-label={label} className={cn('relative flex rounded-[11px] bg-fill p-[0.1875rem]', className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn('label-case relative z-10 h-8 flex-1 rounded-[8px] px-3 text-sub font-semibold transition-colors', on ? 'text-ink' : 'text-ink-2')}
          >
            {on && (
              <motion.span
                layoutId={`seg-${id}`}
                className="absolute inset-0 -z-10 rounded-[8px] bg-glass-strong shadow-[0_3px_8px_rgb(0_0_0/0.12),0_1px_1px_rgb(0_0_0/0.04)]"
                transition={{ type: 'spring', stiffness: 520, damping: 38 }}
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

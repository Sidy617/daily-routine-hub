import type { ReactNode } from 'react';
import { motion } from 'motion/react';

/** A progress ring that fills with a spring, like Apple's Activity rings. */
export function Ring({
  value,
  size = 44,
  stroke = 4.5,
  colour = 'var(--tint)',
  children,
  label,
}: {
  value: number;
  size?: number;
  stroke?: number;
  colour?: string;
  children?: ReactNode;
  label?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value || 0));
  return (
    <span className="relative inline-grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={label ?? `${Math.round(v * 100)}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--fill)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={colour}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ type: 'spring', stiffness: 70, damping: 18 }}
        />
      </svg>
      {children !== undefined && <span className="tabular absolute inset-0 grid place-items-center">{children}</span>}
    </span>
  );
}

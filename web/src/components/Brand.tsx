import { useId } from 'react';
import { ORG_NAME, APP_NAME } from '@/lib/config';
import { cn, rem } from '@/lib/utils';

// The Simulation logo, traced from the brand picture: a ring holding four bars. The top three run
// straight past the centre before turning back round it; the last opens into a leaf.
// Same drawing as public/icon.svg (made by scripts/make-icons.mjs).
export const LOGO_PATHS = [
  'M49.7 34H110A76 76 0 1 1 34 110',
  'M26.3 61H120C142 61 160 81.6 160 107A50.3 50 0 0 1 59.5 110',
  'M16.3 85H112C126 85 137 96 137 112C137 128 131 146 116 153',
  'M13 110H94C108 110 118 121 118 135C118 143 117 149 116 153',
  'M67 110C68 135 90 153 116 153',
];

function Lines() {
  return (
    <>
      <circle cx="110" cy="110" r="97" />
      {LOGO_PATHS.map((d) => (
        <path key={d} d={d} />
      ))}
    </>
  );
}

/**
 * The Simulation logo as orange glass tubes: a dark edge with a soft shadow, the orange body,
 * and a light line along the top. Small marks drop the light line and draw thicker so they stay solid.
 */
export function BrandMark({ size = 36, className }: { size?: number; className?: string }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const body = `sim-body-${uid}`;
  const shadow = `sim-shadow-${uid}`;
  const small = size < 44;
  const w = small ? 12 : 10;
  return (
    <svg viewBox="0 0 220 220" className={cn('shrink-0 overflow-visible', className)} style={{ width: rem(size), height: rem(size) }} aria-hidden="true">
      <defs>
        <linearGradient id={body} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff9a52" />
          <stop offset="0.55" stopColor="#f26a1b" />
          <stop offset="1" stopColor="#d9520a" />
        </linearGradient>
        <filter id={shadow} x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="2.5" dy="4" stdDeviation="3" floodColor="#a33a00" floodOpacity="0.35" />
        </filter>
      </defs>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <g stroke="#b9450a" strokeWidth={w} filter={`url(#${shadow})`}>
          <Lines />
        </g>
        <g stroke={`url(#${body})`} strokeWidth={w * 0.62} transform="translate(-0.5 -0.5)">
          <Lines />
        </g>
        {!small && (
          <g stroke="#ffd2a8" strokeOpacity="0.85" strokeWidth={w * 0.18} transform="translate(-1.5 -1.5)">
            <Lines />
          </g>
        )}
      </g>
    </svg>
  );
}

// "SIMULATION" drawn as in the brand picture: wide, rounded line letters, an A with no bar.
// Letters sit on a 40-high grid (caps from y=2 to y=38) and use the current text colour.
const LETTERS = [
  'M26 7.5C23.5 3.8 19.5 2 14.5 2 7.8 2 3 5.2 3 10.4c0 5.6 5 7.4 11.5 8.9C21 20.8 27 23 27 29.4 27 34.8 22.2 38 14.8 38 9.2 38 4.6 35.8 2 32', // S
  'M41 2v36', // I
  'M54 38V2l16 27 16-27v36', // M
  'M99 2v22a14 14 0 0 0 28 0V2', // U
  'M140 2v36h21', // L
  'M168 38l17-36 17 36', // A, no bar
  'M214 2h28M228 2v36', // T
  'M255 2v36', // I
  'M286 2a18 18 0 1 0 0.01 0Z', // O
  'M317 38V2l28 36V2', // N
];

export function Wordmark({ height, className }: { height: number; className?: string }) {
  return (
    <svg
      viewBox="-3 -1 351 42"
      role="img"
      aria-label={ORG_NAME}
      className={cn('block shrink-0 overflow-visible', className)}
      style={{ height: rem(height), width: rem((height * 351) / 42) }}
    >
      <path d={LETTERS.join('')} fill="none" stroke="currentColor" strokeWidth="4.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Mark and name together. */
export function Brand({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const mark = size === 'lg' ? 52 : size === 'md' ? 34 : 28;
  const word = size === 'lg' ? 22 : size === 'md' ? 14 : 12;
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <BrandMark size={mark} />
      <span className="flex flex-col leading-none">
        <Wordmark height={word} className="text-ink" />
        <span className={cn('label-case font-medium tracking-[0.18em] text-ink-2', size === 'lg' ? 'mt-2 text-body' : 'mt-1.5 text-cap')}>{APP_NAME}</span>
      </span>
    </span>
  );
}

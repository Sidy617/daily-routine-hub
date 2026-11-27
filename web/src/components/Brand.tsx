import { ORG_NAME, APP_NAME } from '@/lib/config';
import { cn, rem } from '@/lib/utils';

/** The Simulation logo: the orange rings, cut from the brand picture (web/public/logo.png). */
export function BrandMark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <img
      src={`${import.meta.env.BASE_URL}logo.png`}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={cn('shrink-0 select-none rounded-[22%] object-cover shadow-sm ring-1 ring-black/5', className)}
      style={{ width: rem(size), height: rem(size) }}
    />
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

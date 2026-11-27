import { useId } from 'react';
import { ORG_NAME, APP_NAME } from '@/lib/config';
import { cn, rem } from '@/lib/utils';

/** Where the sun sits on its arc right now: 06:00 at the left, 18:00 at the right. */
function sunAngle(date = new Date()) {
  const h = date.getHours() + date.getMinutes() / 60;
  const t = Math.max(0, Math.min(1, (h - 6) / 12));
  return Math.PI * (1 - t);
}

/** The Simulation mark: a day's path with the sun on it, where it is now. */
export function BrandMark({ size = 36, className }: { size?: number; className?: string }) {
  // Each mark needs its own gradient ids: a shared id can resolve to a hidden copy and paint nothing.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const tile = `sim-tile-${uid}`;
  const sun = `sim-sun-${uid}`;
  const a = sunAngle();
  const night = new Date().getHours() < 6 || new Date().getHours() >= 18;
  const cx = 32 + 17 * Math.cos(a);
  const cy = 40 - 17 * Math.sin(a);
  return (
    <svg viewBox="0 0 64 64" className={cn('shrink-0', className)} style={{ width: rem(size), height: rem(size) }} aria-hidden="true">
      <defs>
        <linearGradient id={tile} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1e3a64" />
          <stop offset="1" stopColor="#0b1220" />
        </linearGradient>
        <linearGradient id={sun} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="1" stopColor="#ff9f43" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${tile})`} />
      <rect x="0.5" y="0.5" width="63" height="63" rx="14.5" fill="none" stroke="white" strokeOpacity="0.14" />
      <path d="M13 40a19 19 0 0 1 38 0" fill="none" stroke="white" strokeOpacity="0.9" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M10 47h44" stroke="white" strokeOpacity="0.35" strokeWidth="2.4" strokeLinecap="round" />
      {night ? <circle cx="32" cy="21" r="4.2" fill="white" fillOpacity="0.85" /> : <circle cx={cx} cy={cy} r="5.4" fill={`url(#${sun})`} />}
    </svg>
  );
}

/** Mark and name together. */
export function Brand({ size = 'md', className }: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  const mark = size === 'lg' ? 52 : size === 'md' ? 34 : 28;
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <BrandMark size={mark} />
      <span className="flex flex-col leading-none">
        <span className={cn('title-case font-display font-semibold tracking-[-0.028em] text-ink', size === 'lg' ? 'text-[1.75rem]' : size === 'md' ? 'text-[1.0625rem]' : 'text-[0.9375rem]')}>
          {ORG_NAME}
        </span>
        <span className={cn('label-case font-medium text-ink-2', size === 'lg' ? 'mt-1.5 text-body' : 'mt-1 text-cap')}>{APP_NAME}</span>
      </span>
    </span>
  );
}

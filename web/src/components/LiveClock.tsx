import { useMinute } from '@/lib/hooks';
import { cn } from '@/lib/utils';

const two = (n: number) => String(n).padStart(2, '0');

/** The time now, live: it turns over with the device's clock, and its colon breathes each second. */
export function LiveClock({ className }: { className?: string }) {
  const now = useMinute();
  const hh = two(now.getHours());
  const mm = two(now.getMinutes());
  return (
    <time dateTime={`${hh}:${mm}`} className={cn('tabular', className)}>
      {hh}
      <span className="clock-colon">:</span>
      {mm}
    </time>
  );
}

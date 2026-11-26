// Dates are plain "YYYY-MM-DD" strings in the person's own time zone.

const pad = (n: number) => String(n).padStart(2, '0');

export function toISO(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const todayISO = () => toISO(new Date());

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

/** Monday of the week holding this date. */
export function weekStart(iso: string): string {
  const d = fromISO(iso);
  const shift = (d.getDay() + 6) % 7;
  return addDays(iso, -shift);
}

export function weekDays(iso: string): string[] {
  const start = weekStart(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function monthStart(iso: string): string {
  return iso.slice(0, 8) + '01';
}

export function addMonths(iso: string, n: number): string {
  const d = fromISO(monthStart(iso));
  d.setMonth(d.getMonth() + n);
  return toISO(d);
}

/** Whole weeks (Monday first) covering the month; days outside the month are null. */
export function monthGrid(iso: string): (string | null)[][] {
  const first = monthStart(iso);
  const month = first.slice(0, 7);
  const weeks: (string | null)[][] = [];
  let cursor = weekStart(first);
  while (true) {
    const week = Array.from({ length: 7 }, (_, i) => {
      const day = addDays(cursor, i);
      return day.startsWith(month) ? day : null;
    });
    if (week.every((d) => d === null)) break;
    weeks.push(week);
    cursor = addDays(cursor, 7);
  }
  return weeks;
}

export const isSunday = (iso: string) => fromISO(iso).getDay() === 0;

export function dayLabel(iso: string): string {
  return fromISO(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

export function shortDay(iso: string): string {
  return fromISO(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
}

export function monthLabel(iso: string): string {
  return fromISO(iso).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

export function rangeLabel(fromIso: string, toIso: string): string {
  const a = fromISO(fromIso);
  const b = fromISO(toIso);
  const same = a.getMonth() === b.getMonth();
  const left = a.toLocaleDateString('en-GB', same ? { day: 'numeric' } : { day: 'numeric', month: 'short' });
  const right = b.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return `${left} to ${right}`;
}

/** "07:00:00" to "07:00". */
export const hm = (t: string) => t.slice(0, 5);

export function clock(ts: string): string {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/** Times a block can start or end at, every 15 minutes. People pick, never type. */
export const QUARTER_HOURS: string[] = Array.from({ length: 96 }, (_, i) => `${pad(Math.floor(i / 4))}:${pad((i % 4) * 15)}`);

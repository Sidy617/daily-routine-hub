import type { BlockTotal, DayTotal } from './types';

/** A half-done task counts as half. */
export function score(t: { total: number; done: number; half: number }): number {
  if (!t.total) return 0;
  return (t.done + t.half / 2) / t.total;
}

export const pct = (x: number) => Math.round(x * 100);

export function sumTotals(rows: { total: number; done: number; half: number }[]) {
  return rows.reduce(
    (a, r) => ({ total: a.total + r.total, done: a.done + r.done, half: a.half + r.half }),
    { total: 0, done: 0, half: 0 },
  );
}

/** Days with at least one task ticked or half done. */
export function activeDays(rows: DayTotal[]): number {
  return rows.filter((r) => r.done + r.half > 0).length;
}

/**
 * Days in a row with at least one task done or half done, ending today
 * (or yesterday, when today has nothing ticked yet).
 */
export function streak(rows: { date: string; done: number; half: number }[], today: string, addDays: (iso: string, n: number) => string): number {
  const active = new Set(rows.filter((r) => r.done + r.half > 0).map((r) => r.date));
  let day = active.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (active.has(day)) {
    n++;
    day = addDays(day, -1);
  }
  return n;
}

/**
 * The block most often left undone, by name, across the given days.
 * Needs at least 3 tasks under a name before it is named; otherwise null,
 * so we never say something we are not sure of.
 */
export function mostMissed(rows: BlockTotal[]): string | null {
  const byName = new Map<string, { total: number; done: number; half: number }>();
  for (const r of rows) {
    const key = r.name.trim();
    const cur = byName.get(key) ?? { total: 0, done: 0, half: 0 };
    byName.set(key, { total: cur.total + r.total, done: cur.done + r.done, half: cur.half + r.half });
  }
  let worst: string | null = null;
  let worstScore = 1;
  for (const [name, t] of byName) {
    if (t.total < 3) continue;
    const s = score(t);
    if (s < worstScore) {
      worst = name;
      worstScore = s;
    }
  }
  return worstScore < 0.75 ? worst : null;
}

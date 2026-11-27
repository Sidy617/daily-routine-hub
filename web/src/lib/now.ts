// Which block is happening now, which comes next, and how long is left.

export const minutesOf = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + (m || 0);
};

export function nowMinutes(date = new Date()) {
  return date.getHours() * 60 + date.getMinutes();
}

/** A block ending at 00:00 (or before it starts) runs to midnight. */
function span(b: { starts: string; ends: string }) {
  const s = minutesOf(b.starts);
  let e = minutesOf(b.ends);
  if (e <= s) e = 24 * 60;
  return [s, e] as const;
}

export function blockNow<T extends { starts: string; ends: string }>(blocks: T[], at = nowMinutes()) {
  let current = -1;
  let next = -1;
  blocks.forEach((b, i) => {
    const [s, e] = span(b);
    if (at >= s && at < e && current < 0) current = i;
    if (s > at && (next < 0 || s < span(blocks[next])[0])) next = i;
  });
  const left = current >= 0 ? span(blocks[current])[1] - at : 0;
  const until = next >= 0 ? span(blocks[next])[0] - at : 0;
  return { current, next, left, until };
}

/** "2h 10m", "45m", "1h". */
export function duration(mins: number) {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
}

// The sky follows the sun through the day: night, dawn, morning, noon, afternoon, sunset, dusk.
// Times are minutes after midnight on the device's clock. Sunrise and sunset are kept near the
// equator's, where the team is (in Tanzania they move by under half an hour across the year).

export const SUNRISE = 6 * 60 + 15;
export const SUNSET = 18 * 60 + 45;

export type Phase = 'night' | 'dawn' | 'morning' | 'noon' | 'afternoon' | 'sunset' | 'dusk';
export const PHASES: Phase[] = ['night', 'dawn', 'morning', 'noon', 'afternoon', 'sunset', 'dusk'];

// When each phase's colours are at their fullest; between two stops the sky blends them.
const STOPS: [number, Phase][] = [
  [0, 'night'],
  [5 * 60, 'night'],
  [SUNRISE, 'dawn'],
  [8 * 60 + 30, 'morning'],
  [12 * 60 + 30, 'noon'],
  [15 * 60 + 30, 'afternoon'],
  [18 * 60 + 30, 'sunset'],
  [19 * 60 + 15, 'dusk'],
  [20 * 60 + 30, 'night'],
  [24 * 60, 'night'],
];

export interface Sky {
  /** The two phases the sky is between, and how far it has gone from the first (0 to 1). */
  from: Phase;
  to: Phase;
  t: number;
  /** The sun by day, the moon by night: where it is, in percent of the screen from the top left. */
  body: { x: number; y: number; sun: boolean };
  /** The older four parts of the day, for themes that style [data-daypart]. */
  part: 'dawn' | 'day' | 'dusk' | 'night';
}

const tenth = (n: number) => Math.round(n * 10) / 10;

export function skyAt(minutes: number): Sky {
  const m = ((minutes % 1440) + 1440) % 1440;
  let i = 0;
  while (i < STOPS.length - 2 && STOPS[i + 1][0] <= m) i++;
  const [a, from] = STOPS[i];
  const [b, to] = STOPS[i + 1];
  return { from, to, t: Math.round(((m - a) / (b - a)) * 1000) / 1000, body: bodyAt(m), part: partAt(m) };
}

/** Rises at the left, is highest at midday and sets at the right; the moon takes the same path by night. */
function bodyAt(m: number) {
  const sun = m >= SUNRISE && m < SUNSET;
  const p = sun ? (m - SUNRISE) / (SUNSET - SUNRISE) : ((m - SUNSET + 1440) % 1440) / (1440 - (SUNSET - SUNRISE));
  return { x: tenth(4 + 92 * p), y: tenth(46 - 40 * Math.sin(Math.PI * p)), sun };
}

function partAt(m: number): Sky['part'] {
  const h = m / 60;
  if (h >= 5 && h < 9) return 'dawn';
  if (h >= 9 && h < 16) return 'day';
  if (h >= 16 && h < 19) return 'dusk';
  return 'night';
}

export const minutesNow = (date = new Date()) => date.getHours() * 60 + date.getMinutes();

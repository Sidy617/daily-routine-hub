// Reads days saved by the first design (localStorage keys cyber_routine_YYYY-MM-DD)
// so nothing written there is lost. Days left exactly as the first design
// pre-filled them are skipped: they are samples, not records.
import type { Status } from './types';

export interface OldTask {
  text: string;
  status: string;
  notes?: string;
}

export interface OldDay {
  date: string;
  blocks: Record<string, OldTask[]>;
  blockers?: string;
  actionPlan?: string;
  tomorrowPlan?: string;
}

export interface ImportedDay {
  date: string;
  missed: string;
  fix: string;
  tomorrow: string;
  blocks: { name: string; starts: string; ends: string; position: number; tasks: { text: string; status: Status; note: string }[] }[];
}

export const OLD_BLOCKS: Record<string, { name: string; starts: string; ends: string }> = {
  b1: { name: 'Morning reflection', starts: '06:00', ends: '06:15' },
  b2: { name: 'University studies', starts: '07:00', ends: '16:00' },
  b3: { name: 'Engineering and AI', starts: '16:00', ends: '20:00' },
  b4: { name: 'Cybersecurity', starts: '20:00', ends: '23:30' },
  b5: { name: 'Review and planning', starts: '23:30', ends: '23:59' },
};

const SAMPLE: Record<string, [string, string][]> = {
  b1: [['Wake up at 06:00 AM & 15 mins reflection', 'completed']],
  b2: [
    ['University Course Lectures & Assignments', 'pending'],
    ['Read book chapter (Personal Growth / Communication)', 'pending'],
    ['Listen to speech audio / life skills podcast', 'pending'],
  ],
  b3: [
    ['Web Dev & AI project coding sprint', 'pending'],
    ['Project commits & team feature tasks', 'pending'],
  ],
  b4: [
    ['PortSwigger Web Security Academy labs', 'pending'],
    ['Pentesting methodology & attack labs', 'pending'],
  ],
  b5: [
    ['Check daily goals accomplished vs unaccomplished', 'pending'],
    ['Compile visual report & set tomorrow priorities', 'pending'],
  ],
};
const SAMPLE_NOTE_B1 = 'Reflected on daily goals.';

export function mapStatus(s: string): Status {
  if (s === 'completed') return 'done';
  if (s === 'partial') return 'half';
  return 'todo';
}

/** True when the day is exactly what the first design pre-filled, untouched. */
export function isUntouchedSample(day: OldDay): boolean {
  if ((day.blockers ?? '') || (day.actionPlan ?? '') || (day.tomorrowPlan ?? '')) return false;
  for (const key of Object.keys(SAMPLE)) {
    const tasks = day.blocks?.[key] ?? [];
    const sample = SAMPLE[key];
    if (tasks.length !== sample.length) return false;
    for (let i = 0; i < tasks.length; i++) {
      if (tasks[i].text !== sample[i][0] || tasks[i].status !== sample[i][1]) return false;
      const expectedNote = key === 'b1' ? SAMPLE_NOTE_B1 : '';
      if ((tasks[i].notes ?? '') !== expectedNote) return false;
    }
  }
  return Object.keys(day.blocks ?? {}).every((k) => k in SAMPLE);
}

/** Days written by the first design's "Load Demo" button are made up; they carry this signature. */
export function isDemo(day: OldDay): boolean {
  return (
    (day.actionPlan ?? '') === 'Created standardized boilerplate header script.' ||
    (day.blocks?.b5?.[0]?.text ?? '') === 'End of day goal verification & report compile'
  );
}

/** "2026-W48" (ISO week) to the Monday that starts it, "2026-11-23". */
export function isoWeekToMonday(key: string): string | null {
  const m = /^(\d{4})-W(\d{2})$/.exec(key);
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  const jan4 = new Date(year, 0, 4);
  const mondayOfWeek1 = new Date(year, 0, 4 - ((jan4.getDay() + 6) % 7));
  const d = new Date(mondayOfWeek1);
  d.setDate(mondayOfWeek1.getDate() + (week - 1) * 7);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function convertOldDay(day: OldDay): ImportedDay {
  const keys = Object.keys(day.blocks ?? {}).sort();
  return {
    date: day.date,
    missed: (day.blockers ?? '').slice(0, 2000),
    fix: (day.actionPlan ?? '').slice(0, 2000),
    tomorrow: (day.tomorrowPlan ?? '').slice(0, 2000),
    blocks: keys.map((key, position) => {
      const meta = OLD_BLOCKS[key] ?? { name: key, starts: '00:00', ends: '00:00' };
      return {
        ...meta,
        position,
        tasks: (day.blocks[key] ?? [])
          .filter((t) => (t.text ?? '').trim())
          .map((t) => ({ text: t.text.trim().slice(0, 200), status: mapStatus(t.status), note: (t.notes ?? '').slice(0, 500) })),
      };
    }),
  };
}

/** All real (not sample) old days in this browser, oldest first. */
export function readOldDays(storage: Pick<Storage, 'length' | 'key' | 'getItem'>): ImportedDay[] {
  const out: ImportedDay[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || !/^cyber_routine_\d{4}-\d{2}-\d{2}$/.test(key)) continue;
    try {
      const day = JSON.parse(storage.getItem(key) ?? 'null') as OldDay | null;
      if (!day || !day.blocks) continue;
      day.date = key.slice('cyber_routine_'.length);
      if (isUntouchedSample(day) || isDemo(day)) continue;
      out.push(convertOldDay(day));
    } catch {
      // a broken entry is skipped, never guessed at
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

export function readOldWeekGoals(storage: Pick<Storage, 'length' | 'key' | 'getItem'>): { week: string; goals: string }[] {
  const out: { week: string; goals: string }[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key?.startsWith('cyber_weekly_goals_')) continue;
    const goals = (storage.getItem(key) ?? '').trim();
    const week = isoWeekToMonday(key.slice('cyber_weekly_goals_'.length));
    if (goals && week) out.push({ week, goals: goals.slice(0, 2000) });
  }
  return out;
}

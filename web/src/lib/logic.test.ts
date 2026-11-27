import { describe, expect, it } from 'vitest';
import { addDays, monthGrid, weekDays, weekStart, isSunday } from './dates';
import { mostMissed, score, activeDays, streak } from './stats';
import { convertOldDay, isDemo, isUntouchedSample, isoWeekToMonday, readOldDays, type OldDay } from './importOld';
import type { BlockTotal, DayTotal } from './types';
import { blockNow, duration } from './now';
import { avatarKey, splitKey } from './avatars';

describe('now', () => {
  const day = [
    { starts: '06:00:00', ends: '06:15:00' },
    { starts: '07:00:00', ends: '16:00:00' },
    { starts: '23:30:00', ends: '00:00:00' },
  ];
  it('finds the block happening now and the time left', () => {
    expect(blockNow(day, 8 * 60)).toEqual({ current: 1, next: 2, left: 8 * 60, until: 15 * 60 + 30 });
  });
  it('knows the next block between blocks', () => {
    const r = blockNow(day, 6 * 60 + 30);
    expect(r.current).toBe(-1);
    expect(r.next).toBe(1);
    expect(r.until).toBe(30);
  });
  it('runs a block ending at midnight to the end of the day', () => {
    expect(blockNow(day, 23 * 60 + 45).current).toBe(2);
  });
  it('writes durations shortly', () => {
    expect(duration(130)).toBe('2h 10m');
    expect(duration(45)).toBe('45m');
    expect(duration(60)).toBe('1h');
  });
});

describe('avatars', () => {
  it('keeps a valid choice and never guesses a skin tone', () => {
    expect(avatarKey({ name: 'Juma', avatar: 'student-medium-dark' })).toBe('student-medium-dark');
    expect(avatarKey({ name: 'Juma', avatar: 'nonsense' })).toMatch(/-default$/);
    expect(avatarKey({ name: 'Juma' })).toBe(avatarKey({ name: ' juma ' }));
  });
  it('splits keys with two-word tones and characters', () => {
    expect(splitKey('office-worker-medium-light')).toEqual({ character: 'office-worker', tone: 'medium-light' });
    expect(splitKey('person-dark')).toEqual({ character: 'person', tone: 'dark' });
  });
});

describe('dates', () => {
  it('starts weeks on Monday', () => {
    expect(weekStart('2026-11-26')).toBe('2026-11-23'); // Thursday
    expect(weekStart('2026-11-29')).toBe('2026-11-23'); // Sunday stays in its week
    expect(weekStart('2026-11-23')).toBe('2026-11-23');
    expect(weekDays('2026-11-26')).toHaveLength(7);
  });
  it('crosses months and years', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2027-03-01', -1)).toBe('2027-02-28');
  });
  it('lays a month out in whole weeks', () => {
    const grid = monthGrid('2026-11-10');
    expect(grid[0][6]).toBe('2026-11-01'); // 1 Nov 2026 is a Sunday
    expect(grid.flat().filter(Boolean)).toHaveLength(30);
    expect(isSunday('2026-11-29')).toBe(true);
  });
});

describe('stats', () => {
  it('counts a half-done task as half', () => {
    expect(score({ total: 4, done: 1, half: 2 })).toBe(0.5);
    expect(score({ total: 0, done: 0, half: 0 })).toBe(0);
  });
  it('names the most missed block only when sure', () => {
    const row = (name: string, total: number, done: number): BlockTotal => ({
      id: name + total, day_id: 'd', user_id: 'u', date: '2026-11-26', name, starts: '07:00', position: 0, total, done, half: 0,
    });
    expect(mostMissed([row('Study', 2, 0)])).toBeNull(); // too few tasks to say
    expect(mostMissed([row('Study', 4, 4), row('Security', 2, 0), row('Security', 2, 1)])).toBe('Security');
    expect(mostMissed([row('Study', 4, 4), row('Gym', 4, 4)])).toBeNull(); // nothing missed
  });
  it('counts a streak back from today, or from yesterday before anything is ticked today', () => {
    const r = (date: string, done: number) => ({ date, done, half: 0 });
    const rows = [r('2026-11-24', 2), r('2026-11-25', 1), r('2026-11-26', 3)];
    expect(streak(rows, '2026-11-26', addDays)).toBe(3);
    expect(streak(rows, '2026-11-27', addDays)).toBe(3);
    expect(streak([...rows, r('2026-11-27', 0)], '2026-11-28', addDays)).toBe(0);
  });
  it('counts active days', () => {
    const d = (done: number): DayTotal => ({ day_id: 'x', user_id: 'u', date: '2026-11-26', updated_at: '', total: 3, done, half: 0 });
    expect(activeDays([d(0), d(1), d(3)])).toBe(2);
  });
});

const sampleDay = (): OldDay => ({
  date: '2026-11-20',
  blocks: {
    b1: [{ text: 'Wake up at 06:00 AM & 15 mins reflection', status: 'completed', notes: 'Reflected on daily goals.' }],
    b2: [
      { text: 'University Course Lectures & Assignments', status: 'pending', notes: '' },
      { text: 'Read book chapter (Personal Growth / Communication)', status: 'pending', notes: '' },
      { text: 'Listen to speech audio / life skills podcast', status: 'pending', notes: '' },
    ],
    b3: [
      { text: 'Web Dev & AI project coding sprint', status: 'pending', notes: '' },
      { text: 'Project commits & team feature tasks', status: 'pending', notes: '' },
    ],
    b4: [
      { text: 'PortSwigger Web Security Academy labs', status: 'pending', notes: '' },
      { text: 'Pentesting methodology & attack labs', status: 'pending', notes: '' },
    ],
    b5: [
      { text: 'Check daily goals accomplished vs unaccomplished', status: 'pending', notes: '' },
      { text: 'Compile visual report & set tomorrow priorities', status: 'pending', notes: '' },
    ],
  },
  blockers: '',
  actionPlan: '',
  tomorrowPlan: '',
});

describe('bringing days from the first design', () => {
  it('skips a day left exactly as pre-filled', () => {
    expect(isUntouchedSample(sampleDay())).toBe(true);
  });
  it('keeps a day someone worked on', () => {
    const day = sampleDay();
    day.blocks.b2[0].status = 'completed';
    expect(isUntouchedSample(day)).toBe(false);
    const withReview = sampleDay();
    withReview.tomorrowPlan = 'Lab 4';
    expect(isUntouchedSample(withReview)).toBe(false);
  });
  it('skips demo days', () => {
    expect(isDemo({ date: 'x', blocks: {}, actionPlan: 'Created standardized boilerplate header script.' })).toBe(true);
    expect(isDemo(sampleDay())).toBe(false);
  });
  it('maps blocks, statuses and the review', () => {
    const day = sampleDay();
    day.blocks.b2[0].status = 'partial';
    day.blockers = 'Ran out of time';
    const out = convertOldDay(day);
    expect(out.blocks.map((b) => b.name)).toEqual([
      'Morning reflection', 'University studies', 'Engineering and AI', 'Cybersecurity', 'Review and planning',
    ]);
    expect(out.blocks[1].tasks[0].status).toBe('half');
    expect(out.blocks[0].tasks[0].status).toBe('done');
    expect(out.missed).toBe('Ran out of time');
  });
  it('reads storage and turns week keys into Mondays', () => {
    const worked = sampleDay();
    worked.blocks.b4[0].status = 'completed';
    const entries: [string, string][] = [
      ['cyber_routine_2026-11-20', JSON.stringify(sampleDay())],
      ['cyber_routine_2026-11-21', JSON.stringify(worked)],
      ['cyber_routine_bad', '{'],
      ['other', 'x'],
    ];
    const storage = {
      length: entries.length,
      key: (i: number) => entries[i]?.[0] ?? null,
      getItem: (k: string) => entries.find((e) => e[0] === k)?.[1] ?? null,
    };
    const days = readOldDays(storage);
    expect(days.map((d) => d.date)).toEqual(['2026-11-21']);
    expect(isoWeekToMonday('2026-W48')).toBe('2026-11-23');
    expect(isoWeekToMonday('2027-W01')).toBe('2027-01-04');
  });
});

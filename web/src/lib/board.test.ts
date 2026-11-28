import { describe, expect, it } from 'vitest';
import { arrange, cleanTopic, kindForHour, latestAims, tally, usedTopics } from './board';
import { compare } from './stats';
import type { DayTotal, Pin, Post, Reaction } from './types';

const post = (id: string, over: Partial<Post> = {}): Post => ({
  id,
  team_id: 't',
  user_id: 'a',
  date: '2026-11-28',
  kind: 'aim',
  body: id,
  parent_id: null,
  people: [],
  topics: [],
  created_at: `2026-11-28T08:00:0${id.length}Z`,
  edited_at: null,
  ...over,
});

describe('cleanTopic', () => {
  it('makes a topic people can type into one the database accepts', () => {
    expect(cleanTopic('#Lab 4')).toBe('lab-4');
    expect(cleanTopic('  API tests!! ')).toBe('api-tests');
    expect(cleanTopic('---')).toBe('');
    expect(cleanTopic('a'.repeat(40))).toHaveLength(24);
  });
});

describe('kindForHour', () => {
  it('asks for the aim before 17:00 and what was learned after', () => {
    expect(kindForHour(8)).toBe('aim');
    expect(kindForHour(16)).toBe('aim');
    expect(kindForHour(17)).toBe('learned');
  });
});

describe('arrange', () => {
  const posts = [
    post('a1', { created_at: '2026-11-28T09:00:00Z' }),
    post('a2', { created_at: '2026-11-28T10:00:00Z', topics: ['lab4'] }),
    post('old', { date: '2026-11-27', created_at: '2026-11-27T09:00:00Z', topics: ['lab4'] }),
    post('r1', { kind: 'reply', parent_id: 'a1', created_at: '2026-11-28T11:00:00Z' }),
    post('r0', { kind: 'reply', parent_id: 'a1', created_at: '2026-11-28T10:30:00Z' }),
  ];
  const pins: Pin[] = [{ id: 'p', post_id: 'old', team_id: 't', pinned_by: 'b', pinned_at: '2026-11-28T12:00:00Z' }];

  it('puts pins on top, then lines by day, newest first, without showing a pin twice', () => {
    const f = arrange(posts, pins);
    expect(f.pinned.map((p) => p.id)).toEqual(['old']);
    expect(f.days).toEqual([{ date: '2026-11-28', posts: [posts[1], posts[0]] }]);
  });

  it('keeps replies under their line, oldest first, and out of the feed', () => {
    const f = arrange(posts, []);
    expect(f.replies.get('a1')?.map((p) => p.id)).toEqual(['r0', 'r1']);
    expect(f.days.flatMap((d) => d.posts).some((p) => p.parent_id)).toBe(false);
  });

  it('shows only lines with the chosen topic', () => {
    const f = arrange(posts, pins, 'lab4');
    expect(f.pinned.map((p) => p.id)).toEqual(['old']);
    expect(f.days.flatMap((d) => d.posts).map((p) => p.id)).toEqual(['a2']);
  });
});

describe('tally', () => {
  it('counts each reaction and marks mine', () => {
    const r: Reaction[] = [
      { id: '1', post_id: 'x', user_id: 'me', kind: 'clap' },
      { id: '2', post_id: 'x', user_id: 'b', kind: 'clap' },
      { id: '3', post_id: 'y', user_id: 'b', kind: 'idea' },
    ];
    const t = tally(r, 'x', 'me');
    expect(t.clap).toEqual({ count: 2, mine: true });
    expect(t.idea).toEqual({ count: 0, mine: false });
  });
});

describe('usedTopics and latestAims', () => {
  it('lists topics by use and finds each person’s newest aim', () => {
    const ps = [post('1', { topics: ['api', 'lab4'] }), post('22', { topics: ['lab4'] }), post('333', { kind: 'learned' })];
    expect(usedTopics(ps)).toEqual(['lab4', 'api']);
    expect(latestAims(ps).get('a')?.id).toBe('22');
  });
});

describe('compare', () => {
  const row = (user_id: string, date: string, total: number, done: number, half = 0): DayTotal => ({ day_id: date + user_id, user_id, date, updated_at: '', total, done, half });
  it('ranks by share done, then tasks done; people without tasks come last', () => {
    const rows = [row('a', '2026-11-24', 4, 2), row('a', '2026-11-25', 4, 4), row('b', '2026-11-24', 2, 2), row('c', '2026-11-24', 8, 6)];
    const s = compare(['a', 'b', 'c', 'd'], rows);
    expect(s.map((x) => x.id)).toEqual(['b', 'a', 'c', 'd']);
    expect(s[1]).toMatchObject({ total: 8, done: 6, activeDays: 2 });
    expect(s[3].score).toBeNull();
  });
});

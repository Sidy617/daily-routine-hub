import type { Pin, Post, PostKind, Reaction, ReactionKind } from './types';

export const KIND_LABEL: Record<Exclude<PostKind, 'reply'>, string> = { aim: 'Aim', learned: 'Learned', cheer: 'Cheer' };

export const REACTIONS: { kind: ReactionKind; label: string }[] = [
  { kind: 'clap', label: 'Clap' },
  { kind: 'on_it', label: 'On it' },
  { kind: 'idea', label: 'Idea' },
];

/** Mornings ask for the aim, evenings (from 17:00) for what was learned. */
export const kindForHour = (hour: number): 'aim' | 'learned' => (hour >= 17 ? 'learned' : 'aim');

/** A topic as stored: lowercase letters, digits and dashes, up to 24 characters. Empty when nothing is left. */
export function cleanTopic(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .slice(0, 24)
    .replace(/-+$/, '');
}

export interface Feed {
  /** Pinned lines, most recently pinned first. */
  pinned: Post[];
  /** Other lines by day, newest day first; lines in a day newest first. */
  days: { date: string; posts: Post[] }[];
  /** Replies to each line, oldest first. */
  replies: Map<string, Post[]>;
}

/** Arranges the Board: pins on top, then lines by day. A topic shows only lines tagged with it (pins included). */
export function arrange(posts: Post[], pins: Pin[], topic: string | null = null): Feed {
  const replies = new Map<string, Post[]>();
  for (const p of posts) {
    if (!p.parent_id) continue;
    const list = replies.get(p.parent_id) ?? [];
    list.push(p);
    replies.set(p.parent_id, list);
  }
  for (const list of replies.values()) list.sort((a, b) => a.created_at.localeCompare(b.created_at));

  const lines = posts.filter((p) => !p.parent_id && (!topic || p.topics.includes(topic)));
  const byId = new Map(lines.map((p) => [p.id, p]));
  const pinnedIds = new Set<string>();
  const pinned: Post[] = [];
  for (const pin of [...pins].sort((a, b) => b.pinned_at.localeCompare(a.pinned_at))) {
    const p = byId.get(pin.post_id);
    if (p && !pinnedIds.has(p.id)) {
      pinned.push(p);
      pinnedIds.add(p.id);
    }
  }

  const days: Feed['days'] = [];
  for (const p of [...lines].sort((a, b) => b.created_at.localeCompare(a.created_at))) {
    if (pinnedIds.has(p.id)) continue;
    const last = days.at(-1);
    if (last && last.date === p.date) last.posts.push(p);
    else days.push({ date: p.date, posts: [p] });
  }
  days.sort((a, b) => b.date.localeCompare(a.date));
  return { pinned, days, replies };
}

/** Each reaction's count on a line, and whether I gave it. */
export function tally(reactions: Reaction[], postId: string, meId: string): Record<ReactionKind, { count: number; mine: boolean }> {
  const out: Record<ReactionKind, { count: number; mine: boolean }> = {
    clap: { count: 0, mine: false },
    on_it: { count: 0, mine: false },
    idea: { count: 0, mine: false },
  };
  for (const r of reactions) {
    if (r.post_id !== postId) continue;
    out[r.kind].count++;
    if (r.user_id === meId) out[r.kind].mine = true;
  }
  return out;
}

/** Topics the team uses, most used first. */
export function usedTopics(posts: Post[]): string[] {
  const n = new Map<string, number>();
  for (const p of posts) for (const t of p.topics) n.set(t, (n.get(t) ?? 0) + 1);
  return [...n.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t]) => t);
}

/** The newest aim each person wrote among these lines. */
export function latestAims(lines: Post[]): Map<string, Post> {
  const out = new Map<string, Post>();
  for (const p of lines) {
    if (p.kind !== 'aim') continue;
    const cur = out.get(p.user_id);
    if (!cur || p.created_at > cur.created_at) out.set(p.user_id, p);
  }
  return out;
}

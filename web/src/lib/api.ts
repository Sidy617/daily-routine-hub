import { createClient } from '@supabase/supabase-js';
import { SUPABASE_KEY, SUPABASE_URL } from './config';
import type { Block, BlockTotal, Day, DayBlock, DayTotal, FullDay, LoginFace, Profile, Status, Task, Team } from './types';
import type { ImportedDay } from './importOld';
import { planIsEmpty, planRoutineChange } from './routine';

export const db = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

function must<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

// People and teams -------------------------------------------------------

export async function getProfile(id: string): Promise<Profile | null> {
  return must(await db.from('profiles').select('id,name,colour,theme,share_progress,photo_url,avatar,focus,show_on_login').eq('id', id).maybeSingle());
}

export async function updateProfile(id: string, patch: Partial<Omit<Profile, 'id'>>) {
  must(await db.from('profiles').update(patch).eq('id', id));
}

export async function myTeam(userId: string): Promise<Team | null> {
  const rows = must(
    await db.from('team_members').select('teams(id,name,invite_code)').eq('user_id', userId).order('joined_at').limit(1),
  ) as unknown as { teams: Team | null }[];
  return rows[0]?.teams ?? null;
}

export async function teamPeople(teamId: string): Promise<Profile[]> {
  const rows = must(
    await db.from('team_members').select('profiles(id,name,colour,theme,share_progress,photo_url,avatar,focus,show_on_login)').eq('team_id', teamId).order('joined_at'),
  ) as unknown as { profiles: Profile | null }[];
  return rows.map((r) => r.profiles).filter((p): p is Profile => !!p);
}

export async function joinTeam(code: string) {
  must(await db.rpc('join_team', { code }));
}

export async function createTeam(name: string) {
  must(await db.rpc('create_team', { team_name: name }));
}

/** The public sign-in page's faces: members of teams shown there who allow it. */
export async function loginFaces(): Promise<LoginFace[]> {
  return must(await db.rpc('login_faces_v2'));
}

/** Uploads my photo into my own folder and points my profile at it. Returns the new address. */
export async function setMyPhoto(userId: string, photo: Blob, oldUrl: string | null): Promise<string> {
  const path = `${userId}/${Date.now()}.jpg`;
  must(await db.storage.from('avatars').upload(path, photo, { contentType: 'image/jpeg', cacheControl: '31536000', upsert: false }));
  const url = db.storage.from('avatars').getPublicUrl(path).data.publicUrl;
  await updateProfile(userId, { photo_url: url });
  await removeStoredPhoto(oldUrl);
  return url;
}

export async function clearMyPhoto(userId: string, oldUrl: string | null) {
  await updateProfile(userId, { photo_url: null });
  await removeStoredPhoto(oldUrl);
}

async function removeStoredPhoto(url: string | null) {
  const marker = '/storage/v1/object/public/avatars/';
  if (!url?.includes(marker)) return;
  // Best effort: a leftover old photo costs a little space, never a wrong face.
  await db.storage.from('avatars').remove([url.split(marker)[1]]);
}

// My routine ---------------------------------------------------------------

export async function getBlocks(userId: string): Promise<Block[]> {
  return must(await db.from('blocks').select('*').eq('user_id', userId).order('position').order('starts'));
}

export async function saveBlocks(userId: string, next: Omit<Block, 'user_id'>[], removedIds: string[]) {
  if (removedIds.length) must(await db.from('blocks').delete().in('id', removedIds));
  const rows = next.map((b, position) => ({ ...b, position, user_id: userId }));
  const fresh = rows.filter((b) => b.id.startsWith('new-')).map(({ id: _id, ...rest }) => rest);
  const old = rows.filter((b) => !b.id.startsWith('new-'));
  if (old.length) must(await db.from('blocks').upsert(old));
  if (fresh.length) must(await db.from('blocks').insert(fresh));
}

export const STARTER_BLOCKS: Omit<Block, 'id' | 'user_id'>[] = [
  { name: 'Morning', starts: '06:00', ends: '06:15', position: 0, tasks: ['Set the day\'s aim'] },
  { name: 'Study', starts: '07:00', ends: '16:00', position: 1, tasks: [] },
  { name: 'Build', starts: '16:00', ends: '20:00', position: 2, tasks: [] },
  { name: 'Practice', starts: '20:00', ends: '23:30', position: 3, tasks: [] },
  { name: 'Review', starts: '23:30', ends: '23:59', position: 4, tasks: ['Evening review'] },
];

export async function addStarterBlocks(userId: string) {
  must(await db.from('blocks').insert(STARTER_BLOCKS.map((b) => ({ ...b, user_id: userId }))));
}

/**
 * Saves my routine, then brings the change into today and any later day I already opened,
 * so new blocks and tasks show at once. Days before today keep what they recorded.
 * Returns how many open days changed.
 */
export async function saveRoutine(userId: string, today: string, before: Block[], next: Omit<Block, 'user_id'>[], removedIds: string[]): Promise<number> {
  await saveBlocks(userId, next, removedIds);
  const after = await getBlocks(userId);
  // Brand-new blocks get their ids on save; until then they are matched by name.
  const days = must(await db.from('days').select('id').eq('user_id', userId).gte('date', today)) as { id: string }[];
  let changed = 0;
  for (const { id } of days) {
    const full = await loadDayById(id);
    const plan = planRoutineChange(before, after, removedIds, full.blocks, full.tasks);
    if (planIsEmpty(plan)) continue;
    changed++;
    for (const b of plan.changeBlocks) {
      must(await db.from('day_blocks').update({ name: b.name, starts: b.starts, ends: b.ends, position: b.position }).eq('id', b.id));
    }
    if (plan.removeTasks.length) must(await db.from('tasks').delete().in('id', plan.removeTasks));
    if (plan.removeBlocks.length) must(await db.from('day_blocks').delete().in('id', plan.removeBlocks));
    for (const b of plan.addBlocks) {
      const made = must(
        await db.from('day_blocks').insert({ day_id: id, name: b.name, starts: b.starts, ends: b.ends, position: b.position }).select('id').single(),
      ) as { id: string };
      plan.addTasks.push(...b.tasks.map((text, i) => ({ blockId: made.id, text, position: i + 1 })));
    }
    if (plan.addTasks.length) {
      must(await db.from('tasks').insert(plan.addTasks.map((t) => ({ day_id: id, day_block_id: t.blockId, text: t.text, position: t.position }))));
    }
  }
  return changed;
}

// Days ---------------------------------------------------------------------

/** My own day; created from my routine the first time it is opened. */
export async function openMyDay(date: string): Promise<FullDay> {
  const id = must(await db.rpc('open_day', { d: date })) as string;
  return loadDayById(id);
}

async function loadDayById(id: string): Promise<FullDay> {
  const [day, blocks, tasks] = await Promise.all([
    db.from('days').select('*').eq('id', id).single(),
    db.from('day_blocks').select('*').eq('day_id', id).order('position').order('starts'),
    db.from('tasks').select('*').eq('day_id', id).order('position'),
  ]);
  return { day: must(day) as Day, blocks: must(blocks) as DayBlock[], tasks: must(tasks) as Task[] };
}

/** Someone's day as recorded; null when there is no record or it is not shared. */
export async function readDay(userId: string, date: string): Promise<FullDay | null> {
  const day = must(await db.from('days').select('id').eq('user_id', userId).eq('date', date).maybeSingle()) as { id: string } | null;
  return day ? loadDayById(day.id) : null;
}

export async function saveReview(dayId: string, patch: Partial<Pick<Day, 'missed' | 'fix' | 'tomorrow'>>) {
  must(await db.from('days').update(patch).eq('id', dayId));
}

export async function addTask(dayId: string, blockId: string, text: string, position: number): Promise<Task> {
  return must(await db.from('tasks').insert({ day_id: dayId, day_block_id: blockId, text, position }).select('*').single());
}

export async function updateTask(id: string, patch: Partial<Pick<Task, 'text' | 'status' | 'note'>>) {
  must(await db.from('tasks').update(patch).eq('id', id));
}

export async function deleteTask(id: string) {
  must(await db.from('tasks').delete().eq('id', id));
}

export type { Status };

// Totals for team, week and month ----------------------------------------

export async function dayTotals(userIds: string[], from: string, to: string): Promise<DayTotal[]> {
  if (!userIds.length) return [];
  return must(await db.from('day_totals').select('*').in('user_id', userIds).gte('date', from).lte('date', to));
}

export async function blockTotals(userIds: string[], from: string, to: string): Promise<BlockTotal[]> {
  if (!userIds.length) return [];
  return must(
    await db.from('block_totals').select('*').in('user_id', userIds).gte('date', from).lte('date', to).order('position').order('starts'),
  );
}

/** The evening reviews of the given people on one date (only those shared with me come back). */
export async function reviewsOn(userIds: string[], date: string): Promise<Pick<Day, 'user_id' | 'missed' | 'fix' | 'tomorrow'>[]> {
  if (!userIds.length) return [];
  return must(await db.from('days').select('user_id,missed,fix,tomorrow').in('user_id', userIds).eq('date', date));
}

export async function getWeekGoals(userId: string, weekStart: string): Promise<string> {
  const row = must(await db.from('week_goals').select('goals').eq('user_id', userId).eq('week_start', weekStart).maybeSingle()) as
    | { goals: string }
    | null;
  return row?.goals ?? '';
}

export async function saveWeekGoals(userId: string, weekStart: string, goals: string) {
  must(await db.from('week_goals').upsert({ user_id: userId, week_start: weekStart, goals }));
}

// Carrying unfinished tasks over --------------------------------------------

export interface Unfinished {
  text: string;
  note: string;
  block: string;
}

/** Tasks I left not done on a date, with the name of their block. */
export async function unfinishedOn(userId: string, date: string): Promise<Unfinished[]> {
  const day = must(await db.from('days').select('id').eq('user_id', userId).eq('date', date).maybeSingle()) as { id: string } | null;
  if (!day) return [];
  const [tasks, blocks] = await Promise.all([
    db.from('tasks').select('text,note,status,day_block_id,position').eq('day_id', day.id).neq('status', 'done').order('position'),
    db.from('day_blocks').select('id,name').eq('day_id', day.id),
  ]);
  const names = new Map((must(blocks) as { id: string; name: string }[]).map((b) => [b.id, b.name]));
  return (must(tasks) as (Pick<Task, 'text' | 'note' | 'day_block_id'> & { status: Status })[]).map((t) => ({
    text: t.text,
    note: t.note,
    block: names.get(t.day_block_id) ?? '',
  }));
}

/** Copies tasks into my day: into the block with the same name, else the first block. Returns the new tasks. */
export async function bringOver(full: FullDay, items: Unfinished[]): Promise<Task[]> {
  if (!full.blocks.length || !items.length) return [];
  const byName = new Map(full.blocks.map((b) => [b.name.trim().toLowerCase(), b.id]));
  const rows = items.map((t, i) => ({
    day_id: full.day.id,
    day_block_id: byName.get(t.block.trim().toLowerCase()) ?? full.blocks[0].id,
    text: t.text,
    note: t.note,
    position: 100 + i,
  }));
  return must(await db.from('tasks').insert(rows).select('*')) as Task[];
}

// Bringing days from the first design --------------------------------------

/** Adds each old day that has no record yet. Days already in the app are left alone. */
export async function importDays(userId: string, days: ImportedDay[], goals: { week: string; goals: string }[]) {
  let added = 0;
  for (const d of days) {
    const exists = must(await db.from('days').select('id').eq('user_id', userId).eq('date', d.date).maybeSingle());
    if (exists) continue;
    const day = must(
      await db.from('days').insert({ user_id: userId, date: d.date, missed: d.missed, fix: d.fix, tomorrow: d.tomorrow }).select('id').single(),
    ) as { id: string };
    for (const b of d.blocks) {
      const block = must(
        await db.from('day_blocks').insert({ day_id: day.id, user_id: userId, name: b.name, starts: b.starts, ends: b.ends, position: b.position }).select('id').single(),
      ) as { id: string };
      if (b.tasks.length) {
        must(
          await db.from('tasks').insert(
            b.tasks.map((t, i) => ({ day_id: day.id, day_block_id: block.id, user_id: userId, text: t.text, status: t.status, note: t.note, position: i })),
          ),
        );
      }
    }
    added++;
  }
  for (const g of goals) {
    const have = await getWeekGoals(userId, g.week);
    if (!have) await saveWeekGoals(userId, g.week, g.goals);
  }
  return added;
}

import type { Block, DayBlock, Task } from './types';

/**
 * What to change in a day that already exists when someone saves their routine, so a block or task
 * added today shows today, not only on the next new day.
 *
 * Blocks are matched by their name before or after the change (so a rename follows), else they are new.
 * Nothing that is part of the record is lost: a task that was ticked, half done or has a note stays,
 * and a removed block stays while it holds such a task. Tasks added to the day by hand stay too.
 */
export interface RoutinePlan {
  addBlocks: { key: string; name: string; starts: string; ends: string; position: number; tasks: string[] }[];
  changeBlocks: { id: string; name: string; starts: string; ends: string; position: number }[];
  removeBlocks: string[];
  addTasks: { blockId: string; text: string; position: number }[];
  removeTasks: string[];
}

const key = (s: string) => s.trim().toLowerCase();
const hm = (t: string) => t.slice(0, 5);
const untouched = (t: Task) => t.status === 'todo' && !t.note.trim();

export function planRoutineChange(before: Block[], after: Block[], removedIds: string[], dayBlocks: DayBlock[], tasks: Task[]): RoutinePlan {
  const plan: RoutinePlan = { addBlocks: [], changeBlocks: [], removeBlocks: [], addTasks: [], removeTasks: [] };
  const used = new Set<string>();
  const was = new Map(before.map((b) => [b.id, b]));
  const find = (names: (string | undefined)[]) => {
    const wanted = names.filter((n): n is string => !!n).map(key);
    return dayBlocks.find((d) => !used.has(d.id) && wanted.includes(key(d.name)));
  };

  // Renamed blocks first, by their old name, so a new block that takes an old name cannot steal its day block.
  const order = [...after].sort((a, b) => Number(!was.has(a.id)) - Number(!was.has(b.id)));
  for (const a of order) {
    const old = was.get(a.id);
    const d = find([old?.name, a.name]);
    if (!d) {
      plan.addBlocks.push({ key: a.id, name: a.name, starts: hm(a.starts), ends: hm(a.ends), position: a.position, tasks: [...a.tasks] });
      continue;
    }
    used.add(d.id);
    if (d.name !== a.name || hm(d.starts) !== hm(a.starts) || hm(d.ends) !== hm(a.ends) || d.position !== a.position) {
      plan.changeBlocks.push({ id: d.id, name: a.name, starts: hm(a.starts), ends: hm(a.ends), position: a.position });
    }
    const here = tasks.filter((t) => t.day_block_id === d.id);
    let next = here.reduce((m, t) => Math.max(m, t.position), 0);
    for (const text of a.tasks) {
      if (here.some((t) => key(t.text) === key(text))) continue;
      plan.addTasks.push({ blockId: d.id, text, position: ++next });
    }
    // Only tasks that came from the routine leave with it, and only if nothing was done with them.
    const dropped = (old?.tasks ?? []).filter((o) => !a.tasks.some((t) => key(t) === key(o))).map(key);
    for (const t of here) if (dropped.includes(key(t.text)) && untouched(t)) plan.removeTasks.push(t.id);
  }

  for (const id of removedIds) {
    const old = was.get(id);
    const d = old && find([old.name]);
    if (!d) continue;
    used.add(d.id);
    if (tasks.filter((t) => t.day_block_id === d.id).every(untouched)) plan.removeBlocks.push(d.id);
  }
  return plan;
}

export const planIsEmpty = (p: RoutinePlan) =>
  !p.addBlocks.length && !p.changeBlocks.length && !p.removeBlocks.length && !p.addTasks.length && !p.removeTasks.length;

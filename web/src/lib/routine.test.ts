import { describe, expect, it } from 'vitest';
import { planRoutineChange } from './routine';
import type { Block, DayBlock, Task } from './types';

const block = (id: string, name: string, tasks: string[], starts = '07:00:00', ends = '09:00:00', position = 0): Block => ({ id, user_id: 'me', name, starts, ends, position, tasks });
const dayBlock = (id: string, name: string, starts = '07:00:00', ends = '09:00:00', position = 0): DayBlock => ({ id, day_id: 'd', name, starts, ends, position });
const task = (id: string, blockId: string, text: string, status: Task['status'] = 'todo', note = '', position = 1): Task => ({ id, day_id: 'd', day_block_id: blockId, text, status, note, position });

describe('planRoutineChange: a routine saved today shows today', () => {
  it('adds a new task to the matching block today', () => {
    const before = [block('b1', 'Study', ['Read'])];
    const after = [block('b1', 'Study', ['Read', 'Lab 4'])];
    const plan = planRoutineChange(before, after, [], [dayBlock('x1', 'Study')], [task('t1', 'x1', 'Read')]);
    expect(plan.addTasks).toEqual([{ blockId: 'x1', text: 'Lab 4', position: 2 }]);
    expect(plan.addBlocks).toEqual([]);
  });

  it('adds a new block with its tasks', () => {
    const after = [block('b1', 'Study', []), block('b2', 'Gym', ['Run'], '18:00:00', '19:00:00', 1)];
    const plan = planRoutineChange([block('b1', 'Study', [])], after, [], [dayBlock('x1', 'Study')], []);
    expect(plan.addBlocks).toEqual([{ key: 'b2', name: 'Gym', starts: '18:00', ends: '19:00', position: 1, tasks: ['Run'] }]);
  });

  it('follows a rename and a new time without losing ticked tasks', () => {
    const before = [block('b1', 'Study', ['Read'])];
    const after = [block('b1', 'Deep work', ['Read'], '08:00:00', '10:00:00')];
    const plan = planRoutineChange(before, after, [], [dayBlock('x1', 'Study')], [task('t1', 'x1', 'Read', 'done')]);
    expect(plan.changeBlocks).toEqual([{ id: 'x1', name: 'Deep work', starts: '08:00', ends: '10:00', position: 0 }]);
    expect(plan.addBlocks).toEqual([]);
    expect(plan.removeTasks).toEqual([]);
  });

  it('removes only untouched routine tasks; done, noted and hand-added tasks stay', () => {
    const before = [block('b1', 'Study', ['Read', 'Notes', 'Quiz'])];
    const after = [block('b1', 'Study', [])];
    const tasks = [task('t1', 'x1', 'Read'), task('t2', 'x1', 'Notes', 'todo', 'page 4'), task('t3', 'x1', 'Quiz', 'done'), task('t4', 'x1', 'Mine')];
    const plan = planRoutineChange(before, after, [], [dayBlock('x1', 'Study')], tasks);
    expect(plan.removeTasks).toEqual(['t1']);
  });

  it('removes a dropped block only when nothing in it was done', () => {
    const before = [block('b1', 'Study', ['Read']), block('b2', 'Gym', ['Run'])];
    const empty = planRoutineChange(before, [], ['b1', 'b2'], [dayBlock('x1', 'Study'), dayBlock('x2', 'Gym')], [task('t1', 'x1', 'Read'), task('t2', 'x2', 'Run', 'half')]);
    expect(empty.removeBlocks).toEqual(['x1']);
  });

  it('changes nothing when the day already matches', () => {
    const b = [block('b1', 'Study', ['Read'])];
    const plan = planRoutineChange(b, b, [], [dayBlock('x1', 'Study')], [task('t1', 'x1', 'read')]);
    expect(plan).toEqual({ addBlocks: [], changeBlocks: [], removeBlocks: [], addTasks: [], removeTasks: [] });
  });
});

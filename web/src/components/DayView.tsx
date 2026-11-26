import { useEffect, useRef, useState } from 'react';
import { addTask, deleteTask, saveReview, updateTask } from '../lib/api';
import { hm } from '../lib/dates';
import { useAutosave } from '../lib/hooks';
import type { DayBlock, FullDay, Status, Task } from '../lib/types';
import { SaveState, Segmented } from './bits';

const NEXT: Record<Status, Status> = { todo: 'done', half: 'done', done: 'todo' };
const STATUS_WORD: Record<Status, string> = { todo: 'Not started', half: 'Half done', done: 'Done' };

export function countDone(tasks: Task[]) {
  return { done: tasks.filter((t) => t.status === 'done').length, total: tasks.length };
}

/** A day: blocks with hanging times, their tasks, and the evening review. */
export function DayView({ full, editable, onChange }: { full: FullDay; editable: boolean; onChange: (next: FullDay) => void }) {
  const [editing, setEditing] = useState<Task | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setTasks = (tasks: Task[]) => onChange({ ...full, tasks });

  async function toggle(task: Task) {
    const status = NEXT[task.status];
    const before = full.tasks;
    setTasks(full.tasks.map((t) => (t.id === task.id ? { ...t, status } : t)));
    try {
      await updateTask(task.id, { status });
    } catch {
      setTasks(before);
      setError('That change did not save. Check your connection.');
    }
  }

  async function add(block: DayBlock, text: string) {
    const position = full.tasks.filter((t) => t.day_block_id === block.id).length + 1;
    const task = await addTask(full.day.id, block.id, text, position);
    setTasks([...full.tasks, task]);
  }

  if (!full.blocks.length) {
    return (
      <div className="empty">
        <p>{editable ? 'This day has no blocks.' : 'No blocks on this day.'}</p>
        {editable && (
          <a className="btn" href="#/me">
            Set up my day
          </a>
        )}
      </div>
    );
  }

  return (
    <>
      {error && (
        <p className="problem-line" role="alert">
          {error}
        </p>
      )}
      <ol className="blocks">
        {full.blocks.map((block) => {
          const tasks = full.tasks.filter((t) => t.day_block_id === block.id);
          const { done, total } = countDone(tasks);
          return (
            <li key={block.id} className="block">
              <span className="time">{hm(block.starts)}</span>
              <div className="block-body">
                <div className="block-head">
                  <h2>{block.name}</h2>
                  {total > 0 && (
                    <span className="count">
                      {done}/{total}
                    </span>
                  )}
                </div>
                <ul className="tasks">
                  {tasks.map((t) => (
                    <li key={t.id} className={`task ${t.status}`}>
                      {editable ? (
                        <button className="mark" onClick={() => toggle(t)} aria-label={`${t.text}: ${STATUS_WORD[t.status]}. Tap to change.`}>
                          <Mark status={t.status} />
                        </button>
                      ) : (
                        <span className="mark" aria-label={STATUS_WORD[t.status]}>
                          <Mark status={t.status} />
                        </span>
                      )}
                      {editable ? (
                        <button className="task-text" onClick={() => setEditing(t)}>
                          <span>{t.text}</span>
                          {t.note && <small>{t.note}</small>}
                        </button>
                      ) : (
                        <span className="task-text">
                          <span>{t.text}</span>
                          {t.note && <small>{t.note}</small>}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
                {editable && <AddTask onAdd={(text) => add(block, text)} />}
              </div>
            </li>
          );
        })}
      </ol>
      <Review full={full} editable={editable} onChange={onChange} />
      {editing && (
        <TaskSheet
          task={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            await updateTask(editing.id, patch);
            setTasks(full.tasks.map((t) => (t.id === editing.id ? { ...t, ...patch } : t)));
            setEditing(null);
          }}
          onDelete={async () => {
            await deleteTask(editing.id);
            setTasks(full.tasks.filter((t) => t.id !== editing.id));
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

export function Mark({ status }: { status: Status }) {
  return (
    <svg viewBox="0 0 24 24" className={`mark-svg ${status}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" className="ring" />
      {status === 'half' && <path d="M12 3a9 9 0 0 1 0 18z" className="fill" />}
      {status === 'done' && (
        <>
          <circle cx="12" cy="12" r="9" className="fill" />
          <path d="M7.5 12.5l3 3 6-6.5" className="tick" />
        </>
      )}
    </svg>
  );
}

function AddTask({ onAdd }: { onAdd: (text: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  if (!open) {
    return (
      <button className="add-task" onClick={() => setOpen(true)}>
        + Add
      </button>
    );
  }
  return (
    <form
      className="add-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const clean = text.trim();
        if (!clean || busy) return;
        setBusy(true);
        setFailed(false);
        try {
          await onAdd(clean.slice(0, 200));
          setText('');
        } catch {
          setFailed(true);
        } finally {
          setBusy(false);
        }
      }}
    >
      <input
        autoFocus
        value={text}
        maxLength={200}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
        aria-label="New task"
        placeholder="New task"
      />
      <button className="btn primary" disabled={!text.trim() || busy}>
        Add
      </button>
      <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
        Done
      </button>
      {failed && <span className="problem-line">Not added. Check your connection.</span>}
    </form>
  );
}

function Review({ full, editable, onChange }: { full: FullDay; editable: boolean; onChange: (next: FullDay) => void }) {
  const fields: { key: 'missed' | 'fix' | 'tomorrow'; label: string }[] = [
    { key: 'missed', label: "What didn't happen, and why" },
    { key: 'fix', label: 'The fix' },
    { key: 'tomorrow', label: "Tomorrow's top three" },
  ];
  if (!editable && fields.every((f) => !full.day[f.key])) return null;
  return (
    <section className="review" aria-label="Evening review">
      <h2>Evening review</h2>
      {fields.map((f) =>
        editable ? (
          <ReviewField
            key={f.key + full.day.id}
            label={f.label}
            value={full.day[f.key]}
            onSave={async (v) => {
              await saveReview(full.day.id, { [f.key]: v });
            }}
            onLocal={(v) => onChange({ ...full, day: { ...full.day, [f.key]: v } })}
          />
        ) : (
          full.day[f.key] && (
            <div key={f.key} className="review-read">
              <h3>{f.label}</h3>
              <p>{full.day[f.key]}</p>
            </div>
          )
        ),
      )}
    </section>
  );
}

function ReviewField({ label, value, onSave, onLocal }: { label: string; value: string; onSave: (v: string) => Promise<void>; onLocal: (v: string) => void }) {
  const { state, push } = useAutosave(onSave);
  const id = useRef(`f${Math.random().toString(36).slice(2)}`).current;
  return (
    <div className="field">
      <div className="field-head">
        <label htmlFor={id}>{label}</label>
        <SaveState state={state} />
      </div>
      <textarea
        id={id}
        value={value}
        maxLength={2000}
        rows={2}
        onChange={(e) => {
          onLocal(e.target.value);
          push(e.target.value);
        }}
      />
    </div>
  );
}

function TaskSheet({
  task,
  onClose,
  onSave,
  onDelete,
}: {
  task: Task;
  onClose: () => void;
  onSave: (patch: Pick<Task, 'text' | 'status' | 'note'>) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [text, setText] = useState(task.text);
  const [status, setStatus] = useState<Status>(task.status);
  const [note, setNote] = useState(task.note);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const changed = text !== task.text || status !== task.status || note !== task.note;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setFailed(false);
    try {
      await fn();
    } catch {
      setFailed(true);
      setBusy(false);
    }
  };

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Task" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <button className="btn ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={!changed || !text.trim() || busy} onClick={() => run(() => onSave({ text: text.trim(), status, note: note.trim() }))}>
            Save
          </button>
        </div>
        <label className="field">
          <span>Task</span>
          <input value={text} maxLength={200} onChange={(e) => setText(e.target.value)} />
        </label>
        <div className="field">
          <span>Status</span>
          <Segmented
            label="Status"
            value={status}
            onChange={setStatus}
            options={[
              { value: 'todo', label: 'Not started' },
              { value: 'half', label: 'Half' },
              { value: 'done', label: 'Done' },
            ]}
          />
        </div>
        <label className="field">
          <span>Note</span>
          <textarea value={note} maxLength={500} rows={2} onChange={(e) => setNote(e.target.value)} />
        </label>
        {failed && <p className="problem-line">Not saved. Check your connection.</p>}
        {confirmDelete ? (
          <div className="confirm">
            <span>Delete this task?</span>
            <button className="btn ghost" onClick={() => setConfirmDelete(false)}>
              Keep
            </button>
            <button className="btn danger" disabled={busy} onClick={() => run(onDelete)}>
              Delete
            </button>
          </div>
        ) : (
          <button className="link danger" onClick={() => setConfirmDelete(true)}>
            Delete task
          </button>
        )}
      </div>
    </div>
  );
}

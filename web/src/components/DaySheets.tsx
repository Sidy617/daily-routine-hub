import { useEffect, useRef, useState } from 'react';
import { addTask, deleteTask, saveReview, updateTask } from '@/lib/api';
import { useAutosave } from '@/lib/hooks';
import { blockNow } from '@/lib/now';
import type { FullDay, Status, Task } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Input, Label, Textarea } from './ui/field';
import { Sheet } from './ui/sheet';
import { toast } from './ui/toast';
import { Segment } from './Segment';

/** Quick add: type, pick the block (the one on now is chosen for you), Enter. Stays open for the next one. */
export function AddSheet({
  open,
  onOpenChange,
  full,
  blockId,
  onAdded,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  full: FullDay;
  blockId?: string;
  onAdded: (t: Task) => void;
}) {
  const fallback = (() => {
    const { current, next } = blockNow(full.blocks);
    return full.blocks[current]?.id ?? full.blocks[next]?.id ?? full.blocks[0]?.id ?? '';
  })();
  const [target, setTarget] = useState(blockId ?? fallback);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTarget(blockId ?? fallback);
      setText('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, blockId]);

  async function add() {
    const clean = text.trim().slice(0, 200);
    if (!clean || !target || busy) return;
    setBusy(true);
    try {
      const position = full.tasks.filter((t) => t.day_block_id === target).length + 1;
      onAdded(await addTask(full.day.id, target, clean, position));
      setText('');
      input.current?.focus();
    } catch {
      toast('Not added. Check your connection.', true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="New task"
      right={
        <Button variant="plain" size="bare" className="font-semibold" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      }
    >
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <Input ref={input} autoFocus value={text} maxLength={200} onChange={(e) => setText(e.target.value)} placeholder="What needs doing?" aria-label="Task" enterKeyHint="done" />
        <div>
          <Label>Block</Label>
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
            {full.blocks.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setTarget(b.id)}
                className={cn(
                  'title-case h-9 shrink-0 rounded-full px-4 text-sub font-semibold transition-colors',
                  target === b.id ? 'bg-tint-fill text-tint-ink' : 'bg-fill text-ink-2 hover:text-ink',
                )}
              >
                {b.name}
              </button>
            ))}
          </div>
        </div>
        <Button variant="tint" size="lg" type="submit" disabled={!text.trim() || busy}>
          Add task
        </Button>
      </form>
    </Sheet>
  );
}

/** Edit one task: words, status, note; delete asks once more. */
export function TaskSheet({ task, onClose, onSaved, onDeleted }: { task: Task | null; onClose: () => void; onSaved: (t: Task) => void; onDeleted: (id: string) => void }) {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>('todo');
  const [note, setNote] = useState('');
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (task) {
      setText(task.text);
      setStatus(task.status);
      setNote(task.note);
      setSure(false);
    }
  }, [task]);

  const changed = !!task && (text.trim() !== task.text || status !== task.status || note.trim() !== task.note);

  async function save() {
    if (!task) return;
    if (!changed) return onClose();
    if (!text.trim()) return;
    setBusy(true);
    try {
      const patch = { text: text.trim(), status, note: note.trim() };
      await updateTask(task.id, patch);
      onSaved({ ...task, ...patch });
      onClose();
    } catch {
      toast('Not saved. Check your connection.', true);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!task) return;
    if (!sure) return setSure(true);
    setBusy(true);
    try {
      await deleteTask(task.id);
      onDeleted(task.id);
      onClose();
    } catch {
      toast('Not deleted. Check your connection.', true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      open={!!task}
      onOpenChange={(o) => !o && onClose()}
      title="Task"
      left={
        <Button variant="plain" size="bare" onClick={onClose}>
          Cancel
        </Button>
      }
      right={
        <Button variant="plain" size="bare" className="font-semibold" disabled={busy || !text.trim()} onClick={save}>
          Done
        </Button>
      }
    >
      <div className="space-y-4 pb-2">
        <Input value={text} maxLength={200} onChange={(e) => setText(e.target.value)} aria-label="Task" />
        <Segment
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'todo', label: 'Not started' },
            { value: 'half', label: 'Half done' },
            { value: 'done', label: 'Done' },
          ]}
        />
        <Textarea value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="Note" aria-label="Note" />
        <Button variant="danger" size="lg" className="bg-fill" disabled={busy} onClick={remove}>
          {sure ? 'Tap again to delete' : 'Delete task'}
        </Button>
      </div>
    </Sheet>
  );
}

/** The evening review: three questions, saved as you type. */
export function ReviewSheet({ open, onOpenChange, full, onChange }: { open: boolean; onOpenChange: (o: boolean) => void; full: FullDay; onChange: (f: FullDay) => void }) {
  const fields: { key: 'missed' | 'fix' | 'tomorrow'; label: string; hint: string }[] = [
    { key: 'missed', label: "What didn't happen", hint: 'And why' },
    { key: 'fix', label: 'The fix', hint: 'What changes tomorrow' },
    { key: 'tomorrow', label: "Tomorrow's top three", hint: 'One per line' },
  ];
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Evening review"
      right={
        <Button variant="plain" size="bare" className="font-semibold" onClick={() => onOpenChange(false)}>
          Done
        </Button>
      }
    >
      <div className="space-y-4 pb-2">
        {fields.map((f) => (
          <AutoField
            key={f.key + full.day.id}
            label={f.label}
            placeholder={f.hint}
            value={full.day[f.key]}
            onLocal={(v) => onChange({ ...full, day: { ...full.day, [f.key]: v } })}
            onSave={(v) => saveReview(full.day.id, { [f.key]: v })}
          />
        ))}
      </div>
    </Sheet>
  );
}

/** A text box that saves itself after a pause and says so. */
export function AutoField({
  label,
  value,
  placeholder,
  onLocal,
  onSave,
  rows = 3,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onLocal: (v: string) => void;
  onSave: (v: string) => Promise<void>;
  rows?: number;
}) {
  const { state, push } = useAutosave(onSave);
  const id = useRef(`f${Math.random().toString(36).slice(2)}`).current;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <Label htmlFor={id}>{label}</Label>
        <span className={cn('px-1 text-cap', state === 'error' ? 'text-danger' : 'text-ink-2')} role="status">
          {state === 'saving' ? 'Saving' : state === 'saved' ? 'Saved' : state === 'error' ? 'Not saved' : ''}
        </span>
      </div>
      <Textarea
        id={id}
        rows={rows}
        value={value}
        maxLength={2000}
        placeholder={placeholder}
        onChange={(e) => {
          onLocal(e.target.value);
          push(e.target.value);
        }}
      />
    </div>
  );
}

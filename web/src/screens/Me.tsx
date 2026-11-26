import { useMemo, useState } from 'react';
import { clearMyPhoto, db, getBlocks, importDays, saveBlocks, setMyPhoto, updateProfile } from '../lib/api';
import { squarePhoto } from '../lib/faces';
import { PERSON_COLOURS } from '../lib/colours';
import { QUARTER_HOURS, hm } from '../lib/dates';
import { useLoad } from '../lib/hooks';
import { readOldDays, readOldWeekGoals } from '../lib/importOld';
import type { Block, Profile, Team } from '../lib/types';
import { THEMES, applyTheme } from '../themes';
import { Avatar, Header, Loading, Problem, SaveState } from '../components/bits';

type Draft = Omit<Block, 'user_id'>;

export function Me({ me, team, onProfile }: { me: Profile; team: Team; onProfile: (p: Profile) => void }) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [name, setName] = useState(me.name);
  const [focus, setFocus] = useState(me.focus);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const textChanged = (name.trim() && name.trim() !== me.name) || focus.trim() !== me.focus;

  async function changePhoto(file: File | undefined) {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      const url = await setMyPhoto(me.id, await squarePhoto(file), me.photo_url);
      onProfile({ ...me, photo_url: url });
    } catch (e) {
      setPhotoError((e as Error).message || 'Photo not saved. Check your connection.');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      await clearMyPhoto(me.id, me.photo_url);
      onProfile({ ...me, photo_url: null });
    } catch {
      setPhotoError('Photo not removed. Check your connection.');
    } finally {
      setPhotoBusy(false);
    }
  }

  async function patch(p: Partial<Profile>) {
    setState('saving');
    const before = me;
    onProfile({ ...me, ...p });
    try {
      await updateProfile(me.id, p);
      setState('saved');
    } catch {
      onProfile(before);
      setState('error');
    }
  }

  return (
    <>
      <Header title="Me" sub={team.name} right={<Avatar person={{ ...me, name }} />} />

      <section className="card">
        <div className="card-head">
          <h2>You</h2>
          <SaveState state={state} />
        </div>
        <div className="photo-row">
          <Avatar person={{ ...me, name }} size={72} />
          <div className="row-actions">
            <label className={`btn file-btn${photoBusy ? ' busy' : ''}`}>
              {me.photo_url ? 'Change photo' : 'Add photo'}
              <input type="file" accept="image/*" disabled={photoBusy} onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = '';
                  changePhoto(file);
                }}
              />
            </label>
            {me.photo_url && (
              <button className="btn ghost" disabled={photoBusy} onClick={removePhoto}>
                Remove
              </button>
            )}
          </div>
        </div>
        {photoBusy && <p className="quiet">Saving photo</p>}
        {photoError && <p className="problem-line">{photoError}</p>}
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim() || !textChanged) return;
            patch({ name: name.trim(), focus: focus.trim() });
          }}
        >
          <label className="field">
            <span>Name</span>
            <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span>What you work on</span>
            <input value={focus} maxLength={40} onChange={(e) => setFocus(e.target.value)} />
          </label>
          <button className="btn" disabled={!name.trim() || !textChanged}>
            Save
          </button>
        </form>
        <div className="field">
          <span>Your colour</span>
          <div className="swatches" role="radiogroup" aria-label="Your colour">
            {PERSON_COLOURS.map((c) => (
              <button
                key={c}
                role="radio"
                aria-checked={me.colour === c}
                aria-label={c}
                className="swatch"
                style={{ background: c }}
                onClick={() => patch({ colour: c })}
              />
            ))}
          </div>
        </div>
        <label className="switch-row">
          <span>
            <b>{team.name} can see my days</b>
            <small>Tasks, progress and evening reviews.</small>
          </span>
          <input type="checkbox" role="switch" checked={me.share_progress === true} onChange={(e) => patch({ share_progress: e.target.checked })} />
        </label>
        <label className="switch-row">
          <span>
            <b>Show me on the sign-in page</b>
            <small>Your photo, name and what you work on. Anyone with the address sees it.</small>
          </span>
          <input type="checkbox" role="switch" checked={me.show_on_login} onChange={(e) => patch({ show_on_login: e.target.checked })} />
        </label>
      </section>

      <section className="card">
        <h2>Theme</h2>
        <div className="themes" role="radiogroup" aria-label="Theme">
          {THEMES.map((t) => (
            <button
              key={t.id}
              role="radio"
              aria-checked={me.theme === t.id}
              className="theme-card"
              onClick={() => {
                applyTheme(t.id);
                patch({ theme: t.id });
              }}
            >
              <span className="theme-swatch" aria-hidden="true">
                {t.swatches.map((s) => (
                  <i key={s} style={{ background: s }} />
                ))}
              </span>
              <b>{t.name}</b>
              <small>by {t.by}</small>
              <small>{t.note}</small>
            </button>
          ))}
        </div>
        <p className="quiet">Anyone can add a theme of their own. See web/src/themes in the repo.</p>
      </section>

      <MyDay me={me} />

      <section className="card">
        <h2>Records</h2>
        <p className="quiet">Every day is kept. Look back by day, week or month.</p>
        <a className="btn" href={`#/p/${me.id}/month`}>
          Open my records
        </a>
        <OldData me={me} />
      </section>

      <button className="btn wide ghost" onClick={() => db.auth.signOut()}>
        Sign out
      </button>
    </>
  );
}

function MyDay({ me }: { me: Profile }) {
  const { data, error, reload } = useLoad(() => getBlocks(me.id), [me.id]);
  const [draft, setDraft] = useState<Draft[] | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const list: Draft[] = draft ?? (data ?? []).map((b) => ({ ...b, starts: hm(b.starts), ends: hm(b.ends) }));
  const changed = draft !== null;
  const invalid = list.some((b) => !b.name.trim());

  const edit = (i: number, p: Partial<Draft>) => setDraft(list.map((b, j) => (j === i ? { ...b, ...p } : b)));
  const move = (i: number, by: number) => {
    const next = [...list];
    const [b] = next.splice(i, 1);
    next.splice(i + by, 0, b);
    setDraft(next);
  };

  async function save() {
    setState('saving');
    try {
      await saveBlocks(
        me.id,
        list.map((b) => ({ ...b, name: b.name.trim(), tasks: b.tasks.map((t) => t.trim()).filter(Boolean).slice(0, 20) })),
        removed,
      );
      setDraft(null);
      setRemoved([]);
      setState('saved');
      reload();
    } catch {
      setState('error');
    }
  }

  return (
    <section className="card">
      <div className="card-head">
        <h2>My day</h2>
        <div className="row-actions">
          <SaveState state={state} />
          {changed && (
            <button
              className="btn ghost"
              onClick={() => {
                setDraft(null);
                setRemoved([]);
              }}
            >
              Discard
            </button>
          )}
          <button className="btn primary" disabled={!changed || invalid || state === 'saving'} onClick={save}>
            Save
          </button>
        </div>
      </div>
      <p className="quiet">Changes start with your next new day. Past days keep their own blocks.</p>
      {error && <Problem text={error} retry={reload} />}
      {!error && !data && <Loading />}
      {data && (
        <ol className="edit-blocks">
          {list.map((b, i) => (
            <li key={b.id}>
              <div className="edit-row">
                <label className="field grow">
                  <span>Block</span>
                  <input value={b.name} maxLength={40} onChange={(e) => edit(i, { name: e.target.value })} />
                </label>
                <label className="field">
                  <span>From</span>
                  <TimeSelect value={b.starts} onChange={(v) => edit(i, { starts: v })} />
                </label>
                <label className="field">
                  <span>To</span>
                  <TimeSelect value={b.ends} onChange={(v) => edit(i, { ends: v })} />
                </label>
              </div>
              <label className="field">
                <span>Tasks each day starts with, one per line</span>
                <textarea
                  rows={2}
                  value={b.tasks.join('\n')}
                  onChange={(e) => edit(i, { tasks: e.target.value.split('\n').map((t) => t.slice(0, 200)) })}
                />
              </label>
              <div className="row-actions">
                <button className="btn ghost" disabled={i === 0} onClick={() => move(i, -1)}>
                  Up
                </button>
                <button className="btn ghost" disabled={i === list.length - 1} onClick={() => move(i, 1)}>
                  Down
                </button>
                <button
                  className="btn ghost danger"
                  onClick={() => {
                    if (!b.id.startsWith('new-')) setRemoved([...removed, b.id]);
                    setDraft(list.filter((_, j) => j !== i));
                  }}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {data && (
        <button
          className="btn wide"
          onClick={() => {
            const lastEnd = list[list.length - 1]?.ends ?? '08:00';
            setDraft([...list, { id: `new-${Date.now()}`, name: '', starts: lastEnd, ends: lastEnd, position: list.length, tasks: [] }]);
          }}
        >
          Add a block
        </button>
      )}
    </section>
  );
}

function TimeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const options = QUARTER_HOURS.includes(value) ? QUARTER_HOURS : [value, ...QUARTER_HOURS];
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {options.map((t) => (
        <option key={t} value={t}>
          {t}
        </option>
      ))}
      {!options.includes('23:59') && <option value="23:59">23:59</option>}
    </select>
  );
}

/** Days written in the first design live in this browser only; bring them in once. */
function OldData({ me }: { me: Profile }) {
  const found = useMemo(() => {
    try {
      return { days: readOldDays(localStorage), goals: readOldWeekGoals(localStorage) };
    } catch {
      return { days: [], goals: [] };
    }
  }, []);
  const [state, setState] = useState<{ kind: 'idle' | 'busy' | 'done' | 'error'; added?: number }>({ kind: 'idle' });
  if (!found.days.length && !found.goals.length) return null;
  return (
    <div className="old-data">
      <p>
        This browser has {found.days.length} {found.days.length === 1 ? 'day' : 'days'} from the first design.
      </p>
      {state.kind === 'done' ? (
        <p className="ok-line">
          Added {state.added} {state.added === 1 ? 'day' : 'days'}. Days already here were left as they were.
        </p>
      ) : (
        <button
          className="btn"
          disabled={state.kind === 'busy'}
          onClick={async () => {
            setState({ kind: 'busy' });
            try {
              const added = await importDays(me.id, found.days, found.goals);
              setState({ kind: 'done', added });
            } catch {
              setState({ kind: 'error' });
            }
          }}
        >
          Bring them in
        </button>
      )}
      {state.kind === 'error' && <p className="problem-line">Stopped part way. Try again: days already added are skipped.</p>}
    </div>
  );
}

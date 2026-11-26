import type { ReactNode } from 'react';
import type { BlockTotal, Profile } from '../lib/types';
import { score } from '../lib/stats';
import { useFace } from '../lib/faces';

/** The person's photo, or their drawn face until they add one. */
export function Avatar({ person, size = 36 }: { person: Pick<Profile, 'name' | 'colour'> & { photo_url?: string | null }; size?: number }) {
  const src = useFace(person);
  if (!src) {
    return (
      <span className="avatar initial" style={{ width: size, height: size, background: person.colour, fontSize: size * 0.42 }} aria-hidden="true">
        {(person.name.trim()[0] ?? '?').toUpperCase()}
      </span>
    );
  }
  return <img className="avatar" src={src} alt="" width={size} height={size} style={{ width: size, height: size, background: person.colour }} />;
}

/** One bar per block, filled by how much of it is done. */
export function Ribbon({ blocks, colour }: { blocks: BlockTotal[]; colour: string }) {
  if (!blocks.length) return null;
  return (
    <div className="ribbon" role="img" aria-label={blocks.map((b) => `${b.name} ${b.done} of ${b.total}`).join(', ')}>
      {blocks.map((b) => (
        <span key={b.id} title={`${b.name}: ${b.done} of ${b.total}`}>
          <i style={{ width: `${Math.round(score(b) * 100)}%`, background: colour }} />
        </span>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SaveState({ state }: { state: 'idle' | 'saving' | 'saved' | 'error' }) {
  if (state === 'idle') return null;
  const text = state === 'saving' ? 'Saving' : state === 'saved' ? 'Saved' : 'Not saved. Check your connection.';
  return (
    <span className={`save-state ${state}`} role="status">
      {text}
    </span>
  );
}

export function Loading() {
  return (
    <div className="loading" role="status">
      Loading
    </div>
  );
}

export function Problem({ text, retry }: { text: string; retry?: () => void }) {
  return (
    <div className="problem" role="alert">
      <p>{text}</p>
      {retry && (
        <button className="btn" onClick={retry}>
          Try again
        </button>
      )}
    </div>
  );
}

export function Header({ title, sub, right }: { title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <header className="screen-head">
      <div>
        <h1>{title}</h1>
        {sub && <p className="sub">{sub}</p>}
      </div>
      {right && <div className="head-right">{right}</div>}
    </header>
  );
}

export function Arrows({ onPrev, onNext, nextDisabled, label }: { onPrev: () => void; onNext: () => void; nextDisabled?: boolean; label: string }) {
  return (
    <div className="arrows" role="group" aria-label={label}>
      <button className="icon-btn" onClick={onPrev} aria-label="Earlier">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 6l-6 6 6 6" />
        </svg>
      </button>
      <button className="icon-btn" onClick={onNext} disabled={nextDisabled} aria-label="Later">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 6l6 6-6 6" />
        </svg>
      </button>
    </div>
  );
}

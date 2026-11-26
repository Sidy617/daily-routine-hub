import { useEffect, useState } from 'react';
import { useFace } from '../lib/faces';
import type { LoginFace } from '../lib/types';

function ShowImg({ face }: { face: LoginFace }) {
  const src = useFace(face);
  // While the drawing loads, the tile shows the person's colour.
  return src ? <img src={src} alt="" style={{ background: face.colour }} /> : <span className="show-wait" style={{ background: face.colour }} />;
}

function useReducedMotion() {
  const [reduce, setReduce] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduce(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduce;
}

/**
 * The team in a staggered grid of three columns. Faces rest in grey; the one in focus
 * turns to colour and its name lights up. Hover picks one; otherwise it moves on slowly.
 */
export function TeamShowcase({ faces, team }: { faces: LoginFace[]; team: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [auto, setAuto] = useState(0);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (reduce || hover !== null || faces.length < 2) return;
    const t = window.setInterval(() => setAuto((i) => (i + 1) % faces.length), 2600);
    return () => window.clearInterval(t);
  }, [reduce, hover, faces.length]);

  const active = hover ?? (reduce ? null : auto % Math.max(faces.length, 1));
  const columns = [0, 1, 2]
    .map((c) => faces.map((f, i) => ({ f, i })).filter(({ i }) => i % 3 === c))
    .filter((col) => col.length);
  const state = (i: number) => (active === i ? ' on' : active !== null ? ' dim' : '');

  return (
    <div className="showcase">
      <div className="show-grid" aria-hidden="true">
        {columns.map((col, c) => (
          <div key={c} className={`show-col c${c}`}>
            {col.map(({ f, i }) => (
              <div key={i} className={`show-photo${state(i)}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
                <ShowImg face={f} />
              </div>
            ))}
          </div>
        ))}
      </div>
      <ul className={`show-names${active !== null ? ' cycling' : ''}`} aria-label={`${team} team`}>
        {faces.map((f, i) => (
          <li key={i} className={`show-name${state(i)}`} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <span className="show-pill" style={active === i ? { background: f.colour } : undefined} />
            <span className="show-text">
              <b>{f.name}</b>
              <small>{f.focus || team}</small>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

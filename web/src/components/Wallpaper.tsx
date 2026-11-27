import { useLayoutEffect } from 'react';
import { minutesNow, skyAt } from '@/lib/sky';

const COLOURS = ['top', 'horizon', 'sun', 'glow'] as const;

/** Puts this minute's sky on <html>: the two phases of the day it is between and how far, and where the
 *  sun or moon is. Each theme gives the phases their colours (--phase-<phase>-top and so on). */
export function paintSky(date = new Date()) {
  const s = skyAt(minutesNow(date));
  const root = document.documentElement;
  for (const c of COLOURS) {
    root.style.setProperty(`--sky-a-${c}`, `var(--phase-${s.from}-${c})`);
    root.style.setProperty(`--sky-b-${c}`, `var(--phase-${s.to}-${c})`);
  }
  root.style.setProperty('--sky-t', `${Math.round(s.t * 1000) / 10}%`);
  root.style.setProperty('--sun-x', `${s.body.x}%`);
  root.style.setProperty('--sun-y', `${s.body.y}%`);
  root.dataset.sun = s.body.sun ? 'up' : 'down';
  root.dataset.daypart = s.part;
}

/** The sky behind the app. It follows the sun, a minute at a time, about as fast as the real one. */
export function Wallpaper() {
  useLayoutEffect(() => {
    paintSky();
    let timer = 0;
    const next = () => {
      timer = window.setTimeout(() => {
        paintSky();
        next();
      }, 60_000 - (Date.now() % 60_000) + 50);
    };
    next();
    return () => window.clearTimeout(timer);
  }, []);
  return (
    <div className="wallpaper" aria-hidden="true">
      <div className="sky-sun" />
      <div className="sky-stars" />
    </div>
  );
}

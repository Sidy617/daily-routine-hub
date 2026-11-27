import { useCallback, useEffect, useRef, useState } from 'react';

export type Route =
  | { name: 'today'; date?: string }
  | { name: 'team'; view: 'day' | 'week' }
  | { name: 'person'; id: string; view: 'day' | 'week' | 'month'; date?: string }
  | { name: 'me'; open?: 'day' };

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  const date = (s?: string) => (s && ISO.test(s) ? s : undefined);
  if (parts[0] === 'day') return { name: 'today', date: date(parts[1]) };
  if (parts[0] === 'team') return { name: 'team', view: parts[1] === 'week' ? 'week' : 'day' };
  if (parts[0] === 'me') return parts[1] === 'day' ? { name: 'me', open: 'day' } : { name: 'me' };
  if (parts[0] === 'p' && parts[1]) {
    const view = parts[2] === 'week' || parts[2] === 'month' ? parts[2] : 'day';
    return { name: 'person', id: parts[1], view, date: date(parts[3]) };
  }
  return { name: 'today' };
}

export const go = (path: string) => {
  window.location.hash = path;
};

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}

/** Runs again when someone comes back to the tab, so shared screens are never stale. */
export function useOnReturn(fn: () => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    const on = () => {
      if (document.visibilityState === 'visible') ref.current();
    };
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);
}

/** The time now. It turns over with the device's clock, on each new minute, and at once when the
 *  app comes back into view, so a phone that slept for an hour never shows the old time. */
export function useMinute(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    let timer = 0;
    const next = () => {
      timer = window.setTimeout(() => {
        setNow(new Date());
        next();
      }, 60_000 - (Date.now() % 60_000) + 20);
    };
    next();
    return () => window.clearTimeout(timer);
  }, []);
  useOnReturn(() => setNow(new Date()));
  return now;
}

/** Load something; reload when deps change or on return. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);
  const run = useCallback(() => {
    const mine = ++seq.current;
    load()
      .then((d) => {
        if (mine === seq.current) {
          setData(d);
          setError(null);
        }
      })
      .catch((e: Error) => {
        if (mine === seq.current) setError(e.message || 'Could not load');
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => {
    setData(null);
    run();
  }, [run]);
  useOnReturn(run);
  return { data, error, reload: run, setData };
}

/** Saves typing after a pause; reports 'saving', 'saved' or 'error'. */
export function useAutosave(save: (value: string) => Promise<void>, delay = 700) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef<string | null>(null);
  const latest = useRef(save);
  latest.current = save;
  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    if (pending.current === null) return;
    const value = pending.current;
    pending.current = null;
    latest
      .current(value)
      .then(() => setState('saved'))
      .catch(() => setState('error'));
  }, []);
  const push = useCallback(
    (value: string) => {
      window.clearTimeout(timer.current);
      pending.current = value;
      setState('saving');
      timer.current = window.setTimeout(flush, delay);
    },
    [delay, flush],
  );
  // Leaving the screen never drops what was typed.
  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && flush();
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onHide);
      flush();
    };
  }, [flush]);
  return { state, push };
}

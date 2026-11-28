import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { db } from './api';

let channels = 0;

/**
 * Runs onChange shortly after any of these tables changes in a row I am allowed to read.
 * The database's row rules decide what reaches me, so a private day never does.
 * Changes that arrive together are handled once.
 */
export function useLiveTables(tables: string[], onChange: () => void, enabled = true) {
  const latest = useRef(onChange);
  latest.current = onChange;
  const key = tables.join(',');
  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    const channel = db.channel(`live:${key}:${++channels}`);
    for (const table of key.split(',')) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        window.clearTimeout(timer);
        timer = window.setTimeout(() => latest.current(), 250);
      });
    }
    channel.subscribe();
    return () => {
      window.clearTimeout(timer);
      db.removeChannel(channel);
    };
  }, [key, enabled]);
}

/**
 * Who in my team has the app open and in view right now. I am counted only while my page is
 * visible and I have not hidden it in Me. Uses the team's private channel, which the database
 * lets only members join.
 */
export function useHereNow(teamId: string | null, meId: string, show: boolean): Set<string> {
  const [here, setHere] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (!teamId) return;
    let alive = true;
    let channel: RealtimeChannel | null = null;
    const announce = () => {
      if (!channel) return;
      if (show && document.visibilityState === 'visible') channel.track({ at: Date.now() }).catch(() => undefined);
      else channel.untrack().catch(() => undefined);
    };
    (async () => {
      await db.realtime.setAuth();
      if (!alive) return;
      const ch = db.channel(`team:${teamId}`, { config: { private: true, presence: { key: meId } } });
      channel = ch;
      ch.on('presence', { event: 'sync' }, () => setHere(new Set(Object.keys(ch.presenceState()))));
      ch.subscribe((status) => {
        if (status === 'SUBSCRIBED') announce();
      });
    })().catch(() => undefined);
    document.addEventListener('visibilitychange', announce);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', announce);
      if (channel) db.removeChannel(channel);
      setHere(new Set());
    };
  }, [teamId, meId, show]);
  return here;
}

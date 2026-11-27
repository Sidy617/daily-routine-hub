import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { AnimatePresence, MotionConfig, motion } from 'motion/react';
import { Lock, Plus, SunMedium, UserRound, Users } from 'lucide-react';
import { db, getBlocks, getProfile, joinTeam, myTeam, teamPeople } from './lib/api';
import { go, useOnReturn, useRoute } from './lib/hooks';
import type { Profile, Team } from './lib/types';
import { cn } from './lib/utils';
import { applyTheme } from './themes';
import { Avatar } from './components/Avatar';
import { Brand } from './components/Brand';
import { Wallpaper } from './components/Wallpaper';
import { GlassTabBar } from './components/ui/glass-tab-bar';
import { Toaster } from './components/ui/toast';
import { Button } from './components/ui/button';
import { SignIn } from './screens/SignIn';
import { Today } from './screens/Today';
import { canSee } from './lib/people';

// Screens not needed for the first view load when first opened, so the app opens faster.
const Setup = lazy(() => import('./screens/Setup').then((m) => ({ default: m.Setup })));
const TeamScreen = lazy(() => import('./screens/Team').then((m) => ({ default: m.TeamScreen })));
const Person = lazy(() => import('./screens/Person').then((m) => ({ default: m.Person })));
const Me = lazy(() => import('./screens/Me').then((m) => ({ default: m.Me })));

interface Ctx {
  me: Profile;
  team: Team | null;
  people: Profile[];
  hasBlocks: boolean;
}

/** An invite link (?join=code) is remembered until the person is signed in. */
function rememberInvite() {
  const url = new URL(window.location.href);
  const code = url.searchParams.get('join');
  if (!code) return;
  try {
    localStorage.setItem('join', code);
  } catch {
    // without storage they paste the link on the team step instead
  }
  url.searchParams.delete('join');
  window.history.replaceState(null, '', url.pathname + url.search + url.hash);
}

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <Wallpaper />
      <Toaster />
      <Shell />
    </MotionConfig>
  );
}

function Shell() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [error, setError] = useState<string | null>(null);
  const route = useRoute();

  useEffect(() => {
    rememberInvite();
    db.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = db.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  // Light or dark follows the device; re-apply when it changes.
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const on = () => applyTheme(document.documentElement.dataset.themeId ?? 'meulic');
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const userId = session?.user.id;

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      let code: string | null = null;
      try {
        code = localStorage.getItem('join');
      } catch {
        code = null;
      }
      if (code) {
        try {
          await joinTeam(code);
        } finally {
          try {
            localStorage.removeItem('join');
          } catch {
            // nothing to clear
          }
        }
      }
      const [me, team, blocks] = await Promise.all([getProfile(userId), myTeam(userId), getBlocks(userId)]);
      if (!me) throw new Error('Your profile is missing. Sign out and in again.');
      applyTheme(me.theme, me.colour);
      const people = team ? await teamPeople(team.id) : [];
      let skipped = false;
      try {
        skipped = localStorage.getItem(`setup-done:${userId}`) === '1';
      } catch {
        skipped = false;
      }
      setCtx({ me, team, people, hasBlocks: blocks.length > 0 || skipped });
      setError(null);
    } catch (e) {
      setError((e as Error).message === 'invite not found' ? 'That invite link is not right. Ask for a new one.' : (e as Error).message);
    }
  }, [userId]);

  useEffect(() => {
    setCtx(null);
    load();
  }, [load]);
  useOnReturn(load);

  if (session === undefined) return <Splash />;
  if (!session) return <SignIn />;
  if (error)
    return (
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-body">{error}</p>
        <Button variant="tint" onClick={load}>
          Try again
        </Button>
      </div>
    );
  if (!ctx) return <Splash />;

  const { me, team, people, hasBlocks } = ctx;
  if (!team || me.share_progress === null || !hasBlocks) {
    return (
      <Suspense fallback={<Splash />}>
        <Setup profile={me} team={team} hasBlocks={hasBlocks} onDone={load} />
      </Suspense>
    );
  }

  const setMe = (p: Profile) => setCtx({ ...ctx, me: p, people: people.map((x) => (x.id === p.id ? p : x)) });

  let screen: React.ReactNode;
  let key: string;
  let tab: 'today' | 'team' | 'me' = 'today';
  if (route.name === 'team') {
    tab = 'team';
    key = 'team';
    screen = <TeamScreen me={me} team={team} people={people} view={route.view} />;
  } else if (route.name === 'person') {
    const person = people.find((p) => p.id === route.id);
    tab = person?.id === me.id ? 'me' : 'team';
    key = `p-${route.id}`;
    screen = person ? (
      <Person me={me} person={person.id === me.id ? me : person} view={route.view} date={route.date} />
    ) : (
      <p className="mx-auto max-w-sm px-6 pt-24 text-center text-body text-ink-2">This person is not in your team.</p>
    );
  } else if (route.name === 'me') {
    tab = 'me';
    key = 'me';
    screen = <Me me={me} team={team} onProfile={setMe} openDay={route.open === 'day'} />;
  } else {
    key = `day-${route.date ?? 'today'}`;
    screen = <Today me={me} date={route.date} />;
  }

  const tabs = [
    { id: 'today', label: 'Today', icon: <SunMedium />, href: '/' },
    { id: 'team', label: 'Team', icon: <Users />, href: '/team' },
    { id: 'me', label: 'Me', icon: <UserRound />, href: '/me' },
  ];
  const onToday = route.name === 'today';

  return (
    <div className="min-h-dvh lg:pl-[276px]">
      <aside className="glass-strong fixed inset-y-3 left-3 z-30 hidden w-[252px] flex-col rounded-[26px] p-4 lg:flex">
        <a href="#/" className="px-2 pt-1">
          <Brand size="md" />
        </a>
        <nav className="mt-7 space-y-0.5" aria-label="Main">
          {tabs.map((t) => (
            <a
              key={t.id}
              href={`#${t.href}`}
              aria-current={tab === t.id ? 'page' : undefined}
              className={cn('relative flex h-10 items-center gap-3 rounded-[12px] px-3 text-body font-medium transition-colors [&_svg]:size-[19px]', tab === t.id ? 'text-ink' : 'text-ink-2 hover:text-ink')}
            >
              {tab === t.id && <motion.span layoutId="side-active" className="absolute inset-0 -z-10 rounded-[12px] bg-fill" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
              <span className={tab === t.id ? 'text-tint' : ''}>{t.icon}</span>
              {t.label}
            </a>
          ))}
        </nav>
        <p className="label-case mt-7 mb-1 px-3 text-cap font-semibold text-ink-2">{team.name}</p>
        <div className="-mx-1 space-y-0.5 overflow-y-auto px-1">
          {people.map((p) => (
            <a key={p.id} href={`#/p/${p.id}/day`} className="flex h-10 items-center gap-2.5 rounded-[12px] px-2 transition-colors hover:bg-fill/70">
              <Avatar person={p} size={28} />
              <span className="title-case min-w-0 flex-1 truncate text-sub font-medium">{p.id === me.id ? `${p.name} (you)` : p.name}</span>
              {!canSee(p, me) && <Lock className="size-3.5 text-ink-3" />}
            </a>
          ))}
        </div>
        <div className="mt-auto space-y-2 pt-4">
          {onToday && (
            <Button variant="tint" size="lg" onClick={() => window.dispatchEvent(new Event('routine:add'))}>
              <Plus /> New task
            </Button>
          )}
          <a href="#/me" className="flex items-center gap-2.5 rounded-[14px] p-2 transition-colors hover:bg-fill/70">
            <Avatar person={me} size={34} />
            <span className="min-w-0">
              <span className="title-case block truncate text-sub font-semibold">{me.name}</span>
              <span className="block truncate text-cap text-ink-2">{me.focus || team.name}</span>
            </span>
          </a>
        </div>
      </aside>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={key} exit={{ opacity: 0, y: -6, transition: { duration: 0.14 } }}>
          <Suspense fallback={<div className="min-h-dvh" role="status" aria-label="Loading" />}>{screen}</Suspense>
        </motion.div>
      </AnimatePresence>

      <nav className="safe-bottom pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center lg:hidden" aria-label="Main">
        <div className="pointer-events-auto">
          <GlassTabBar
            tabs={tabs.map(({ id, label, icon }) => ({ id, label, icon }))}
            value={tab}
            onChange={(id) => go(tabs.find((t) => t.id === id)?.href ?? '/')}
            side={
              onToday ? (
                <button type="button" aria-label="New task" onClick={() => window.dispatchEvent(new Event('routine:add'))}>
                  <Plus />
                </button>
              ) : undefined
            }
          />
        </div>
      </nav>
    </div>
  );
}

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center" role="status" aria-label="Loading">
      <motion.div initial={{ opacity: 0, scale: 0.94 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
        <Brand size="lg" />
      </motion.div>
    </div>
  );
}

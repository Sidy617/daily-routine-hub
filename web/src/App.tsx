import { useCallback, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { db, getBlocks, getProfile, joinTeam, myTeam, teamPeople } from './lib/api';
import { APP_NAME, ORG_NAME } from './lib/config';
import { useOnReturn, useRoute } from './lib/hooks';
import type { Profile, Team } from './lib/types';
import { applyTheme } from './themes';
import { Loading, Problem } from './components/bits';
import { SignIn } from './screens/SignIn';
import { Setup } from './screens/Setup';
import { Today } from './screens/Today';
import { TeamScreen } from './screens/Team';
import { Person } from './screens/Person';
import { Me } from './screens/Me';

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
      applyTheme(me.theme);
      const people = team ? await teamPeople(team.id) : [];
      let setupSkipped = false;
      try {
        setupSkipped = localStorage.getItem(`setup-done:${userId}`) === '1';
      } catch {
        setupSkipped = false;
      }
      setCtx({ me, team, people, hasBlocks: blocks.length > 0 || setupSkipped });
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

  if (session === undefined) return <Loading />;
  if (!session) return <SignIn />;
  if (error) return <Problem text={error} retry={load} />;
  if (!ctx) return <Loading />;

  const { me, team, people, hasBlocks } = ctx;
  if (!team || me.share_progress === null || !hasBlocks) {
    return <Setup profile={me} team={team} hasBlocks={hasBlocks} onDone={load} />;
  }

  const setMe = (p: Profile) => setCtx({ ...ctx, me: p, people: people.map((x) => (x.id === p.id ? p : x)) });

  let screen: React.ReactNode;
  let tab: 'today' | 'team' | 'me' = 'today';
  if (route.name === 'team') {
    tab = 'team';
    screen = <TeamScreen me={me} team={team} people={people} view={route.view} />;
  } else if (route.name === 'person') {
    const person = people.find((p) => p.id === route.id);
    tab = person?.id === me.id ? 'me' : 'team';
    screen = person ? (
      <Person me={me} person={person.id === me.id ? me : person} view={route.view} date={route.date} />
    ) : (
      <Problem text="This person is not in your team." />
    );
  } else if (route.name === 'me') {
    tab = 'me';
    screen = <Me me={me} team={team} onProfile={setMe} />;
  } else {
    screen = <Today me={me} date={route.date} />;
  }

  return (
    <div className="app">
      <nav className="tabs" aria-label="Main">
        <span className="brand">
          {ORG_NAME} <span>{APP_NAME}</span>
        </span>
        <a href="#/" aria-current={tab === 'today' ? 'page' : undefined}>
          <TabIcon name="today" />
          Today
        </a>
        <a href="#/team" aria-current={tab === 'team' ? 'page' : undefined}>
          <TabIcon name="team" />
          Team
        </a>
        <a href="#/me" aria-current={tab === 'me' ? 'page' : undefined}>
          <TabIcon name="me" />
          Me
        </a>
      </nav>
      <main className="screen">{screen}</main>
    </div>
  );
}

function TabIcon({ name }: { name: 'today' | 'team' | 'me' }) {
  const paths = {
    today: 'M4 6h16M4 12h16M4 18h10',
    team: 'M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm8 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM2 20c0-3 3-5 6-5s6 2 6 5m2-5c3 0 6 2 6 5',
    me: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9c0-4 4-6 8-6s8 2 8 6',
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="tab-icon">
      <path d={paths[name]} />
    </svg>
  );
}

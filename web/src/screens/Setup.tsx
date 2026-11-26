import { useState } from 'react';
import { addStarterBlocks, createTeam, joinTeam, updateProfile } from '../lib/api';
import { ORG_NAME } from '../lib/config';
import type { Profile, Team } from '../lib/types';

/** First run, one question at a time: team, sharing, then the shape of the day. */
export function Setup({
  profile,
  team,
  hasBlocks,
  onDone,
}: {
  profile: Profile;
  team: Team | null;
  hasBlocks: boolean;
  onDone: () => void;
}) {
  if (!team) return <TeamStep onDone={onDone} />;
  if (profile.share_progress === null) return <ShareStep profile={profile} team={team} onDone={onDone} />;
  if (!hasBlocks) return <BlocksStep profile={profile} onDone={onDone} />;
  return null;
}

function Shell({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <main className="auth">
      <p className="org">
        {ORG_NAME}, step {step} of 3
      </p>
      <h1>{title}</h1>
      {children}
    </main>
  );
}

function useRun() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError((e as Error).message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function TeamStep({ onDone }: { onDone: () => void }) {
  const [link, setLink] = useState('');
  const [name, setName] = useState('');
  const { busy, error, run } = useRun();
  const code = (() => {
    const m = /join=([a-f0-9]+)/i.exec(link) ?? /^([a-f0-9]{8,})$/i.exec(link.trim());
    return m?.[1] ?? '';
  })();
  return (
    <Shell step={1} title="Join your team">
      <p className="sub">Paste the invite link a teammate sent you.</p>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            await joinTeam(code);
            onDone();
          });
        }}
      >
        <label className="field">
          <span>Invite link</span>
          <input value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" />
        </label>
        <button className="btn primary wide" disabled={!code || busy}>
          Join
        </button>
      </form>
      <details className="more">
        <summary>Start a new team instead</summary>
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            run(async () => {
              await createTeam(name.trim());
              onDone();
            });
          }}
        >
          <label className="field">
            <span>Team name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
          </label>
          <button className="btn wide" disabled={!name.trim() || busy}>
            Start team
          </button>
        </form>
      </details>
      {error && <p className="problem-line">{error === 'invite not found' ? 'That invite link is not right. Ask for a new one.' : error}</p>}
    </Shell>
  );
}

function ShareStep({ profile, team, onDone }: { profile: Profile; team: Team; onDone: () => void }) {
  const { busy, error, run } = useRun();
  const choose = (share: boolean) =>
    run(async () => {
      await updateProfile(profile.id, { share_progress: share });
      onDone();
    });
  return (
    <Shell step={2} title={`Let ${team.name} see your days?`}>
      <p className="sub">Your tasks, how far you got, and your evening review. You can change this any time in Me.</p>
      <div className="stack">
        <button className="btn primary wide" disabled={busy} onClick={() => choose(true)}>
          Yes, share with my team
        </button>
        <button className="btn wide" disabled={busy} onClick={() => choose(false)}>
          Keep them to myself
        </button>
      </div>
      {error && <p className="problem-line">{error}</p>}
    </Shell>
  );
}

function BlocksStep({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const { busy, error, run } = useRun();
  return (
    <Shell step={3} title="Shape your day">
      <p className="sub">Start from five blocks and change them to fit you, or set your own from empty.</p>
      <ol className="starter">
        <li><span>06:00</span>Morning</li>
        <li><span>07:00</span>Study</li>
        <li><span>16:00</span>Build</li>
        <li><span>20:00</span>Practice</li>
        <li><span>23:30</span>Review</li>
      </ol>
      <div className="stack">
        <button
          className="btn primary wide"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await addStarterBlocks(profile.id);
              onDone();
            })
          }
        >
          Use these five
        </button>
        <a
          className="btn wide"
          href="#/me"
          onClick={() => {
            try {
              localStorage.setItem(`setup-done:${profile.id}`, '1');
            } catch {
              // fine: they land in Me either way
            }
            onDone();
          }}
        >
          Set my own
        </a>
      </div>
      {error && <p className="problem-line">{error}</p>}
    </Shell>
  );
}

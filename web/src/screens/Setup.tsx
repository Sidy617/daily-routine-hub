import { useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { addStarterBlocks, createTeam, joinTeam, updateProfile } from '@/lib/api';
import type { Profile, Team } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Brand } from '@/components/Brand';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/field';

/** First run, one question at a time: team, sharing, then the shape of the day. */
export function Setup({ profile, team, hasBlocks, onDone }: { profile: Profile; team: Team | null; hasBlocks: boolean; onDone: () => void }) {
  if (!team) return <TeamStep onDone={onDone} />;
  if (profile.share_progress === null) return <ShareStep profile={profile} team={team} onDone={onDone} />;
  if (!hasBlocks) return <BlocksStep profile={profile} onDone={onDone} />;
  return null;
}

function Shell({ step, title, sub, children }: { step: number; title: string; sub: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[420px] flex-col justify-center px-5 pt-[calc(env(safe-area-inset-top,0px)+24px)] pb-10">
      <Brand size="md" />
      <motion.div key={step} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} className="glass mt-6 rounded-[28px] p-5">
        <div className="mb-4 flex gap-1.5" aria-label={`Step ${step} of 3`}>
          {[1, 2, 3].map((n) => (
            <span key={n} className={cn('h-1 flex-1 rounded-full transition-colors', n <= step ? 'bg-tint' : 'bg-fill')} />
          ))}
        </div>
        <h1 className="title-case text-title font-semibold">{title}</h1>
        <p className="mt-1 text-sub text-ink-2">{sub}</p>
        <div className="mt-5">{children}</div>
      </motion.div>
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
      const m = (e as Error).message || 'Something went wrong';
      setError(m === 'invite not found' ? 'That invite link is not right. Ask for a new one.' : m);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function TeamStep({ onDone }: { onDone: () => void }) {
  const [link, setLink] = useState('');
  const [name, setName] = useState('');
  const [starting, setStarting] = useState(false);
  const { busy, error, run } = useRun();
  const code = (/join=([a-f0-9]+)/i.exec(link) ?? /^([a-f0-9]{8,})$/i.exec(link.trim()))?.[1] ?? '';
  return (
    <Shell step={1} title={starting ? 'Start a team' : 'Join your team'} sub={starting ? 'Name it; you can invite people next.' : 'Paste the invite link a teammate sent you.'}>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            if (starting) await createTeam(name.trim());
            else await joinTeam(code);
            onDone();
          });
        }}
      >
        {starting ? (
          <div>
            <Label htmlFor="team">Team name</Label>
            <Input id="team" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          </div>
        ) : (
          <div>
            <Label htmlFor="invite">Invite link</Label>
            <Input id="invite" value={link} onChange={(e) => setLink(e.target.value)} inputMode="url" />
          </div>
        )}
        {error && <p className="px-1 text-sub text-danger">{error}</p>}
        <Button variant="tint" size="lg" type="submit" disabled={busy || (starting ? !name.trim() : !code)}>
          {starting ? 'Start team' : 'Join'}
        </Button>
      </form>
      <button type="button" className="mt-4 w-full text-center text-sub font-semibold text-tint" onClick={() => setStarting(!starting)}>
        {starting ? 'I have an invite link' : 'Start a new team instead'}
      </button>
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
    <Shell step={2} title={`Let ${team.name} see your days?`} sub="Your tasks, how far you got, and your evening review. You can change this any time in Me.">
      <div className="space-y-2">
        <Button variant="tint" size="lg" disabled={busy} onClick={() => choose(true)}>
          Share with my team
        </Button>
        <Button variant="quiet" size="lg" disabled={busy} onClick={() => choose(false)}>
          Keep them to myself
        </Button>
      </div>
      {error && <p className="mt-3 px-1 text-sub text-danger">{error}</p>}
    </Shell>
  );
}

function BlocksStep({ profile, onDone }: { profile: Profile; onDone: () => void }) {
  const { busy, error, run } = useRun();
  const starter: [string, string][] = [
    ['06:00', 'Morning'],
    ['07:00', 'Study'],
    ['16:00', 'Build'],
    ['20:00', 'Practice'],
    ['23:30', 'Review'],
  ];
  return (
    <Shell step={3} title="Shape your day" sub="Start from five blocks and change them any time, or set your own.">
      <ol className="mb-4 divide-y divide-line overflow-hidden rounded-[16px] bg-fill">
        {starter.map(([t, n]) => (
          <li key={t} className="flex items-center gap-4 px-4 py-2.5">
            <span className="tabular w-12 text-sub text-ink-2">{t}</span>
            <span className="text-body font-medium">{n}</span>
          </li>
        ))}
      </ol>
      <div className="space-y-2">
        <Button
          variant="tint"
          size="lg"
          disabled={busy}
          onClick={() =>
            run(async () => {
              await addStarterBlocks(profile.id);
              onDone();
            })
          }
        >
          Use these five
        </Button>
        <Button variant="quiet" size="lg" asChild>
          <a
            href="#/me/day"
            onClick={() => {
              try {
                localStorage.setItem(`setup-done:${profile.id}`, '1');
              } catch {
                // fine: they land in My day either way
              }
              onDone();
            }}
          >
            Set my own
          </a>
        </Button>
      </div>
      {error && <p className="mt-3 px-1 text-sub text-danger">{error}</p>}
    </Shell>
  );
}

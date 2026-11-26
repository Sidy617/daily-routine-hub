import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { db, loginFaces } from '@/lib/api';
import { faceUrl } from '@/lib/avatars';
import { ORG_NAME } from '@/lib/config';
import { useMedia } from '@/lib/useMedia';
import type { LoginFace } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AvatarCircles } from '@/components/Avatar';
import { Brand } from '@/components/Brand';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/field';

export function SignIn() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [faces, setFaces] = useState<LoginFace[]>([]);
  const wide = useMedia('(min-width: 1024px)');

  useEffect(() => {
    // The team's faces are a welcome, not a requirement: if they fail, the form still works.
    loginFaces()
      .then(setFaces)
      .catch(() => setFaces([]));
  }, []);

  const joining = (() => {
    try {
      return !!localStorage.getItem('join');
    } catch {
      return false;
    }
  })();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'up') {
        const { data, error } = await db.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() }, emailRedirectTo: window.location.origin + window.location.pathname },
        });
        if (error) throw error;
        if (!data.session) setMessage({ ok: true, text: 'Check your email and open the link, then sign in here.' });
      } else {
        const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (err) {
      const text = (err as Error).message || 'Something went wrong';
      setMessage({ ok: false, text: text === 'Invalid login credentials' ? 'Email or password is wrong.' : text });
    } finally {
      setBusy(false);
    }
  }

  const who =
    faces.length === 0 ? '' : faces.length === 1 ? `${faces[0].name} is here` : faces.length === 2 ? `${faces[0].name} and ${faces[1].name} are here` : `${faces[0].name}, ${faces[1].name} and ${faces.length - 2} more`;

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-[1120px] items-center gap-12 px-5 pt-[calc(env(safe-area-inset-top,0px)+28px)] pb-10 lg:grid-cols-[1.2fr_1fr] lg:px-10">
      {wide && faces.length > 0 && <Showcase faces={faces} />}

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className={cn('mx-auto w-full max-w-[400px]', !(wide && faces.length) && 'lg:col-span-2')}
      >
        <Brand size="lg" />

        {!wide && faces.length > 0 && (
          <div className="mt-7 flex items-center gap-3">
            <AvatarCircles people={faces} max={5} size={40} />
            <p className="min-w-0 text-sub text-ink-2">{who}</p>
          </div>
        )}

        <div className="glass mt-6 rounded-[28px] p-5">
          <h1 className="title-case text-title font-semibold">{mode === 'in' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="mt-0.5 text-sub text-ink-2">{joining ? `Sign in to join ${ORG_NAME}.` : "Your day, and your team's."}</p>
          <form onSubmit={submit} className="mt-5 space-y-3">
            {mode === 'up' && (
              <div>
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required autoComplete="name" />
              </div>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
              />
              {mode === 'up' && <p className="mt-1 px-1 text-cap text-ink-3">At least 8 characters</p>}
            </div>
            {message && (
              <p className={cn('px-1 text-sub', message.ok ? 'text-success' : 'text-danger')} role="status">
                {message.text}
              </p>
            )}
            <Button variant="tint" size="lg" type="submit" disabled={busy} className="mt-2">
              {mode === 'up' ? 'Create account' : 'Continue'}
            </Button>
          </form>
        </div>
        <p className="mt-4 text-center text-sub text-ink-2">
          {mode === 'in' ? 'New here?' : 'Have an account?'}{' '}
          <button
            type="button"
            className="font-semibold text-tint"
            onClick={() => {
              setMode(mode === 'in' ? 'up' : 'in');
              setMessage(null);
            }}
          >
            {mode === 'in' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
      </motion.section>
    </main>
  );
}

/** The team in a staggered grid: faces rest softly muted, one comes into colour at a time. */
function Showcase({ faces }: { faces: LoginFace[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [auto, setAuto] = useState(0);
  useEffect(() => {
    if (hover !== null || faces.length < 2) return;
    const t = window.setInterval(() => setAuto((i) => (i + 1) % faces.length), 2600);
    return () => window.clearInterval(t);
  }, [hover, faces.length]);
  const active = hover ?? auto % faces.length;
  const cols = [0, 1, 2].map((c) => faces.map((f, i) => ({ f, i })).filter(({ i }) => i % 3 === c)).filter((c) => c.length);
  const offsets = ['mt-0', 'mt-16', 'mt-8'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8 }} className="flex items-start gap-10" aria-label={`${ORG_NAME} team`}>
      <div className="flex shrink-0 gap-3" aria-hidden="true">
        {cols.map((col, c) => (
          <div key={c} className={cn('flex flex-col gap-3', offsets[c])}>
            {col.map(({ f, i }) => (
              <Tile key={i} face={f} on={active === i} dim={active !== i} big={c === 1} onEnter={() => setHover(i)} onLeave={() => setHover(null)} />
            ))}
          </div>
        ))}
      </div>
      <ul className="min-w-0 flex-1 space-y-4 pt-2">
        {faces.map((f, i) => (
          <li
            key={i}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className={cn('flex gap-3 transition-opacity duration-300', active === i ? 'opacity-100' : 'opacity-45')}
          >
            <span className="mt-[7px] h-3 rounded-[5px] transition-all duration-300" style={{ width: active === i ? 22 : 14, background: active === i ? f.colour : 'var(--ink-3)' }} />
            <span className="min-w-0">
              <span className="title-case block truncate text-title font-semibold">{f.name}</span>
              <span className="label-case block truncate text-sub text-ink-2">{f.focus || ORG_NAME}</span>
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function Tile({ face, on, dim, big, onEnter, onLeave }: { face: LoginFace; on: boolean; dim: boolean; big: boolean; onEnter: () => void; onLeave: () => void }) {
  const { url, isPhoto } = faceUrl(face);
  return (
    <motion.div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      animate={{ scale: on ? 1.04 : 1, opacity: dim ? 0.72 : 1 }}
      transition={{ type: 'spring', stiffness: 260, damping: 24 }}
      className={cn('overflow-hidden rounded-[26px] shadow-[0_18px_40px_-22px_rgb(0_0_0/0.45)]', big ? 'h-[168px] w-[150px]' : 'h-[150px] w-[136px]')}
      style={{ background: `color-mix(in srgb, ${face.colour} 26%, var(--glass-strong))` }}
    >
      <img
        src={url}
        alt=""
        draggable={false}
        className={cn('size-full transition-[filter] duration-500', isPhoto ? 'object-cover' : 'translate-y-[8%] scale-[0.86] object-contain', !on && 'saturate-[0.35]')}
      />
    </motion.div>
  );
}

import { useState } from 'react';
import { db } from '../lib/api';
import { APP_NAME, ORG_NAME } from '../lib/config';
import { Segmented } from '../components/bits';

export function SignIn() {
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'bad'; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === 'up') {
        const { data, error } = await db.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim() }, emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) setMessage({ kind: 'ok', text: 'Check your email and open the link, then sign in here.' });
      } else {
        const { error } = await db.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (err) {
      const text = (err as Error).message || 'Something went wrong';
      setMessage({ kind: 'bad', text: text === 'Invalid login credentials' ? 'Email or password is wrong.' : text });
    } finally {
      setBusy(false);
    }
  }

  const joining = (() => {
    try {
      return !!localStorage.getItem('join');
    } catch {
      return false;
    }
  })();

  return (
    <main className="auth">
      <p className="org">{ORG_NAME}</p>
      <h1>{APP_NAME}</h1>
      <p className="sub">{joining ? 'Sign in to join your team.' : 'Your day, and your team\'s.'}</p>
      <Segmented
        label="Account"
        value={mode}
        onChange={(m) => {
          setMode(m);
          setMessage(null);
        }}
        options={[
          { value: 'in', label: 'Sign in' },
          { value: 'up', label: 'New account' },
        ]}
      />
      <form onSubmit={submit} className="stack">
        {mode === 'up' && (
          <label className="field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required autoComplete="name" />
          </label>
        )}
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
          />
          {mode === 'up' && <small>At least 8 characters.</small>}
        </label>
        {message && (
          <p className={message.kind === 'ok' ? 'ok-line' : 'problem-line'} role="status">
            {message.text}
          </p>
        )}
        <button className="btn primary wide" disabled={busy}>
          {mode === 'up' ? 'Create account' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}

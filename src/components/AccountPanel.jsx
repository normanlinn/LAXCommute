import Button from './ui/Button';
import { useState } from 'react';
import { Check, Mail, LogOut, ArrowRight, LockKeyhole, UserRound } from 'lucide-react';
import { useAccount } from '../hooks/useAccount';
import { getAuthClient } from '../services/auth';

export default function AccountPanel({ profile, onSaved }) {
  const { user, ready, authError, recovering, setRecovering } = useAccount();
  const [mode, setMode] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const client = await getAuthClient();
      let result;
      if (recovering) {
        result = await client.auth.updateUser({ password });
        if (!result.error) {
          setRecovering(false);
          setPassword('');
          setMessage('Your password has been updated.');
        }
      } else if (mode === 'signup') {
        result = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: `${location.origin}/`, data: { commute: profile } },
        });
        if (!result.error)
          setMessage(
            result.data.session
              ? 'Your account is ready.'
              : 'Check your email to confirm your account, then sign in here.',
          );
      } else if (mode === 'reset') {
        result = await client.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${location.origin}/`,
        });
        if (!result.error) setMessage('If an account exists, a password reset link has been sent.');
      } else {
        result = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (!result.error) {
          setPassword('');
          setMessage('You’re signed in.');
        }
      }
      if (result.error) throw result.error;
    } catch (reason) {
      setError(reason.message || 'Could not complete this request. Please retry.');
    } finally {
      setBusy(false);
    }
  }
  async function signOut() {
    setBusy(true);
    setError('');
    try {
      const client = await getAuthClient();
      const { error: reason } = await client.auth.signOut();
      if (reason) throw reason;
      setMessage('Signed out. Your guest commute is available on this device.');
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }
  if (!ready)
    return (
      <section className="card bg-base-100 page-card">
        <p>Loading your account…</p>
      </section>
    );
  if (user && !recovering)
    return (
      <section className="card bg-base-100 page-card account-card">
        <div className="feature-icon">
          <UserRound size={27} />
        </div>
        <span className="eyebrow">YOUR ACCOUNT</span>
        <h1>You’re ready to go.</h1>
        <p className="email-display">
          <Mail size={17} />
          {user.email}
        </p>
        <div className="account-summary">
          <Check size={19} />
          <div>
            <strong>
              {profile.terminal} ↔ {profile.lot} Lot
            </strong>
            <span>Your saved commute syncs with this account.</span>
          </div>
        </div>
        <Button className="button button-primary full-width" onClick={onSaved}>
          Edit saved commute <ArrowRight size={17} />
        </Button>
        <Button className="button button-light full-width" onClick={signOut} disabled={busy}>
          <LogOut size={16} />
          {busy ? 'Signing out…' : 'Sign out'}
        </Button>
        {error && (
          <p className="alert alert-soft alert-warning notice" role="alert">
            {error}
          </p>
        )}
      </section>
    );
  return (
    <section className="card bg-base-100 page-card account-card">
      <div className="feature-icon">
        <LockKeyhole size={26} />
      </div>
      <span className="eyebrow">A LITTLE LESS SETUP, EVERY DAY</span>
      <h1>
        {recovering
          ? 'Choose a new password.'
          : mode === 'signup'
            ? 'Make it your commute.'
            : mode === 'reset'
              ? 'Reset your password.'
              : 'Welcome back.'}
      </h1>
      <p>
        Save your terminal, parking lot, and walking time. You can always browse departures as a
        guest.
      </p>
      {!recovering && (
        <div className="tabs tabs-box segmented">
          <Button
            className={mode === 'signin' ? 'tab tab-active active' : 'tab'}
            onClick={() => {
              setMode('signin');
              setError('');
              setMessage('');
            }}
          >
            Sign in
          </Button>
          <Button
            className={mode === 'signup' ? 'tab tab-active active' : 'tab'}
            onClick={() => {
              setMode('signup');
              setError('');
              setMessage('');
            }}
          >
            Create account
          </Button>
        </div>
      )}
      <form onSubmit={submit}>
        {!recovering && (
          <label className="field">
            Email address
            <input
              className="input w-full"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
        )}
        {(recovering || mode !== 'reset') && (
          <label className="field">
            Password
            <input
              className="input w-full"
              type="password"
              autoComplete={mode === 'signin' && !recovering ? 'current-password' : 'new-password'}
              required
              minLength={mode === 'signin' && !recovering ? 1 : 8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                mode === 'signup' || recovering ? 'At least 8 characters' : 'Your password'
              }
            />
          </label>
        )}
        <Button type="submit" className="button button-primary full-width" disabled={busy}>
          {busy
            ? 'Please wait…'
            : recovering
              ? 'Update password'
              : mode === 'signup'
                ? 'Create account'
                : mode === 'reset'
                  ? 'Send reset link'
                  : 'Sign in'}
          <ArrowRight size={17} />
        </Button>
      </form>
      {!recovering && mode === 'signin' && (
        <Button className="text-button" onClick={() => setMode('reset')}>
          Forgot password?
        </Button>
      )}
      {(error || authError) && (
        <p className="alert alert-soft alert-warning notice" role="alert">
          {error || authError}
        </p>
      )}
      {message && (
        <p className="alert alert-soft alert-success success-message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}

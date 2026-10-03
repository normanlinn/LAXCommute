import { authErrorMessage, authReturnUrl } from '../domain/auth';
import Button from './ui/Button';
import { useEffect, useState } from 'react';
import { Check, Mail, LogOut, ArrowRight, LockKeyhole, UserRound } from 'lucide-react';
import { useAccount } from '../hooks/useAccount';
import { getAuthClient } from '../services/auth';

export default function AccountPanel({
  profile,
  onSaved,
  onGuest,
}: {
  profile: import('../types').Commute;
  onSaved: () => void;
  onGuest?: () => void;
}) {
  const { user, ready, authError, authMessage, clearAuthError, recovering, setRecovering } =
    useAccount();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset' | 'confirm' | 'reset-code'>(
    'signin',
  );
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const needsCode = mode === 'confirm' || mode === 'reset-code';
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown((seconds) => Math.max(0, seconds - 1)), 1_000);
    return () => clearTimeout(timer);
  }, [cooldown]);
  function changeMode(next: typeof mode) {
    setMode(next);
    setError('');
    setMessage('');
    setPassword('');
    setCode('');
    clearAuthError?.();
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    if (!navigator.onLine) {
      setError('You’re offline. Reconnect to use your account, or continue as a guest.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    clearAuthError?.();
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
      } else if (needsCode) {
        result = await client.auth.verifyOtp({
          email: email.trim(),
          token: code.trim(),
          type: mode === 'reset-code' ? 'recovery' : 'email',
        });
        if (!result.error) {
          setCode('');
          if (mode === 'reset-code') setRecovering(true);
          else {
            setMode('signin');
            setMessage('Your email is confirmed. You can now sign in.');
          }
        }
      } else if (mode === 'signup') {
        result = await client.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: authReturnUrl('confirm'), data: { commute: profile } },
        });
        if (!result.error) {
          setPassword('');
          if (result.data.session) setMessage('Your account is ready.');
          else {
            setMode('confirm');
            setCooldown(60);
            setMessage(
              'Check your email. Open the confirmation link in this browser, or enter the code if your email includes one.',
            );
          }
        }
      } else if (mode === 'reset') {
        result = await client.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: authReturnUrl('recovery'),
        });
        if (!result.error) {
          setMode('reset-code');
          setCooldown(60);
          setMessage(
            'If an account exists, a reset email has been sent. Open the latest link in this browser, or enter its code below.',
          );
        }
      } else {
        result = await client.auth.signInWithPassword({ email: email.trim(), password });
        if (!result.error) {
          setPassword('');
          setMessage('You’re signed in.');
        }
      }
      if (result.error) throw result.error;
    } catch (reason) {
      const authReason = reason as { code?: string; message?: string };
      if (
        authReason?.code === 'email_not_confirmed' ||
        /email not confirmed/i.test(authReason?.message || '')
      ) {
        setMode('confirm');
        setPassword('');
      }
      setError(authErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  }
  async function resend() {
    if (busy || cooldown) return;
    if (!email.trim()) {
      setError('Enter your email address first.');
      return;
    }
    if (!navigator.onLine) {
      setError('You’re offline. Reconnect to request an email.');
      return;
    }
    setBusy(true);
    setError('');
    setMessage('');
    clearAuthError?.();
    try {
      const client = await getAuthClient();
      const result =
        mode === 'reset-code'
          ? await client.auth.resetPasswordForEmail(email.trim(), {
              redirectTo: authReturnUrl('recovery'),
            })
          : await client.auth.resend({
              type: 'signup',
              email: email.trim(),
              options: { emailRedirectTo: authReturnUrl('confirm') },
            });
      if (result.error) throw result.error;
      setCooldown(60);
      setCode('');
      setMessage(
        'If your account needs this email, a new one has been sent. Use the most recent link or code.',
      );
    } catch (reason) {
      setError(authErrorMessage(reason));
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
      setMode('signin');
      setPassword('');
      setCode('');
      setMessage('Signed out. Your guest commute is available on this device.');
    } catch (reason) {
      setError(authErrorMessage(reason));
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
        {(error || authError) && (
          <p className="alert alert-soft alert-warning notice" role="alert">
            {error || authError}
          </p>
        )}
        {(message || authMessage) && (
          <p className="alert alert-soft alert-success success-message" role="status">
            {message || authMessage}
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
            : mode === 'confirm'
              ? 'Confirm your email.'
              : mode === 'reset-code'
                ? 'Check your reset email.'
                : mode === 'reset'
                  ? 'Reset your password.'
                  : 'Welcome back.'}
      </h1>
      <p>
        Save your terminal, parking lot, and walking time. You can always browse departures as a
        guest.
      </p>
      {!recovering && !needsCode && (
        <div className="tabs tabs-box segmented">
          <Button
            className={mode === 'signin' ? 'tab tab-active active' : 'tab'}
            onClick={() => changeMode('signin')}
            disabled={busy}
          >
            Sign in
          </Button>
          <Button
            className={mode === 'signup' ? 'tab tab-active active' : 'tab'}
            onClick={() => changeMode('signup')}
            disabled={busy}
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
              name="email"
              autoComplete="email"
              required
              disabled={busy}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
        )}
        {(recovering || (mode !== 'reset' && !needsCode)) && (
          <label className="field">
            Password
            <input
              className="input w-full"
              type="password"
              name="password"
              autoComplete={mode === 'signin' && !recovering ? 'current-password' : 'new-password'}
              required
              disabled={busy}
              minLength={mode === 'signin' && !recovering ? 1 : 8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={
                mode === 'signup' || recovering ? 'At least 8 characters' : 'Your password'
              }
            />
          </label>
        )}
        {needsCode && !recovering && (
          <>
            <label className="field">
              Email code
              <input
                className="input w-full"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                required
                minLength={6}
                maxLength={10}
                pattern="[0-9]{6,10}"
                value={code}
                disabled={busy}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                placeholder="Code from your email"
                aria-describedby="email-code-help"
              />
            </label>
            <p className="small muted" id="email-code-help">
              If your email only contains a link, open it in the browser where you requested it.
            </p>
          </>
        )}
        <Button type="submit" className="button button-primary full-width" disabled={busy}>
          {busy
            ? 'Please wait…'
            : recovering
              ? 'Update password'
              : mode === 'signup'
                ? 'Create account'
                : needsCode
                  ? 'Verify email code'
                  : mode === 'reset'
                    ? 'Send reset link'
                    : 'Sign in'}
          <ArrowRight size={17} />
        </Button>
      </form>
      {!recovering && mode === 'signin' && (
        <>
          <Button className="text-button" onClick={() => changeMode('reset')} disabled={busy}>
            Forgot password?
          </Button>
          <Button className="text-button" onClick={() => changeMode('confirm')} disabled={busy}>
            Confirm email or resend confirmation
          </Button>
        </>
      )}
      {needsCode && !recovering && (
        <>
          <Button
            className="button button-light full-width"
            onClick={resend}
            disabled={busy || cooldown > 0}
          >
            {cooldown
              ? `Resend available in ${cooldown}s`
              : mode === 'reset-code'
                ? 'Resend reset email'
                : 'Resend confirmation email'}
          </Button>
          <Button className="text-button" onClick={() => changeMode('signin')} disabled={busy}>
            Back to sign in
          </Button>
        </>
      )}
      {!recovering && onGuest && (
        <Button className="button button-light full-width" onClick={onGuest}>
          Continue as guest
        </Button>
      )}
      {(error || authError) && (
        <p className="alert alert-soft alert-warning notice" role="alert">
          {error || authError}
        </p>
      )}
      {(message || authMessage) && (
        <p className="alert alert-soft alert-success success-message" role="status">
          {message || authMessage}
        </p>
      )}
    </section>
  );
}

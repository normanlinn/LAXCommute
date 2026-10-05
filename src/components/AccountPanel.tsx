import { useLanguage } from '../i18n/LanguageProvider';
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
  const { t } = useLanguage();
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
        <p>{t('Loading your account…')}</p>
      </section>
    );
  if (user && !recovering)
    return (
      <section className="card bg-base-100 page-card account-card">
        <div className="feature-icon">
          <UserRound size={27} />
        </div>
        <span className="eyebrow">{t('YOUR ACCOUNT')}</span>
        <h1>{t('You’re ready to go.')}</h1>
        <p className="email-display">
          <Mail size={17} />
          {user.email}
        </p>
        <div className="account-summary">
          <Check size={19} />
          <div>
            <strong>
              {profile.terminal} ↔ {profile.lot} {t('Lot')}{' '}
            </strong>
            <span>{t('Your saved commute syncs with this account.')}</span>
          </div>
        </div>
        <Button className="button button-primary full-width" onClick={onSaved}>
          {' '}
          {t('Edit saved commute')} <ArrowRight size={17} />
        </Button>
        <Button className="button button-light full-width" onClick={signOut} disabled={busy}>
          <LogOut size={16} />
          {busy ? t('Signing out…') : t('Sign out')}
        </Button>
        {(error || authError) && (
          <p className="alert alert-soft alert-warning notice" role="alert">
            {t(error || authError)}
          </p>
        )}
        {(message || authMessage) && (
          <p className="alert alert-soft alert-success success-message" role="status">
            {t(message || authMessage)}
          </p>
        )}
      </section>
    );
  return (
    <section className="card bg-base-100 page-card account-card">
      <div className="feature-icon">
        <LockKeyhole size={26} />
      </div>
      <span className="eyebrow">{t('A LITTLE LESS SETUP, EVERY DAY')}</span>
      <h1>
        {recovering
          ? t('Choose a new password.')
          : mode === 'signup'
            ? t('Make it your commute.')
            : mode === 'confirm'
              ? t('Confirm your email.')
              : mode === 'reset-code'
                ? t('Check your reset email.')
                : mode === 'reset'
                  ? t('Reset your password.')
                  : t('Welcome back.')}
      </h1>
      <p>
        {' '}
        {t(
          'Save your terminal, parking lot, and walking time. You can always browse departures as a guest.',
        )}{' '}
      </p>
      {!recovering && !needsCode && (
        <div className="tabs tabs-box segmented" role="group" aria-label={t('YOUR ACCOUNT')}>
          <Button
            className={mode === 'signin' ? 'tab tab-active active' : 'tab'}
            aria-pressed={mode === 'signin'}
            onClick={() => changeMode('signin')}
            disabled={busy}
          >
            {' '}
            {t('Sign in')}{' '}
          </Button>
          <Button
            className={mode === 'signup' ? 'tab tab-active active' : 'tab'}
            aria-pressed={mode === 'signup'}
            onClick={() => changeMode('signup')}
            disabled={busy}
          >
            {' '}
            {t('Create account')}{' '}
          </Button>
        </div>
      )}
      <form onSubmit={submit}>
        {!recovering && (
          <label className="field">
            {' '}
            {t('Email address')}{' '}
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
            {' '}
            {t('Password')}{' '}
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
                mode === 'signup' || recovering ? t('At least 8 characters') : t('Your password')
              }
            />
          </label>
        )}
        {needsCode && !recovering && (
          <>
            <label className="field">
              {' '}
              {t('Email code')}{' '}
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
                placeholder={t('Code from your email')}
                aria-describedby="email-code-help"
              />
            </label>
            <p className="small muted" id="email-code-help">
              {' '}
              {t(
                'If your email only contains a link, open it in the browser where you requested it.',
              )}{' '}
            </p>
          </>
        )}
        <Button type="submit" className="button button-primary full-width" disabled={busy}>
          {busy
            ? t('Please wait…')
            : recovering
              ? t('Update password')
              : mode === 'signup'
                ? t('Create account')
                : needsCode
                  ? t('Verify email code')
                  : mode === 'reset'
                    ? t('Send reset link')
                    : t('Sign in')}
          <ArrowRight size={17} />
        </Button>
      </form>
      {!recovering && mode === 'signin' && (
        <>
          <Button className="text-button" onClick={() => changeMode('reset')} disabled={busy}>
            {' '}
            {t('Forgot password?')}{' '}
          </Button>
          <Button className="text-button" onClick={() => changeMode('confirm')} disabled={busy}>
            {' '}
            {t('Confirm email or resend confirmation')}{' '}
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
              ? t('Resend available in {seconds}s', { seconds: cooldown })
              : mode === 'reset-code'
                ? t('Resend reset email')
                : t('Resend confirmation email')}
          </Button>
          <Button className="text-button" onClick={() => changeMode('signin')} disabled={busy}>
            {' '}
            {t('Back to sign in')}{' '}
          </Button>
        </>
      )}
      {!recovering && onGuest && (
        <Button className="button button-light full-width" onClick={onGuest}>
          {' '}
          {t('Continue as guest')}{' '}
        </Button>
      )}
      {(error || authError) && (
        <p className="alert alert-soft alert-warning notice" role="alert">
          {t(error || authError)}
        </p>
      )}
      {(message || authMessage) && (
        <p className="alert alert-soft alert-success success-message" role="status">
          {t(message || authMessage)}
        </p>
      )}
    </section>
  );
}

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AccountProvider } from '../src/hooks/useAccount';
import AccountPanel from '../src/components/AccountPanel';

const auth = vi.hoisted(() => ({
  initialize: vi.fn(),
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  resend: vi.fn(),
  verifyOtp: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
}));
vi.mock('../src/services/auth', () => ({ getAuthClient: async () => ({ auth }) }));
const profile = { lot: 'South', terminal: 'Terminal B (TBIT)' };
const user = { id: 'test-employee', email: 'employee@example.com' };
beforeEach(() => {
  vi.resetAllMocks();
  history.replaceState({}, '', '/');
  auth.initialize.mockResolvedValue({ error: null });
  auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
  auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } });
  auth.signInWithPassword.mockResolvedValue({ error: null });
  auth.signUp.mockResolvedValue({ data: { session: null }, error: null });
  auth.resend.mockResolvedValue({ error: null });
  auth.resetPasswordForEmail.mockResolvedValue({ error: null });
  auth.verifyOtp.mockResolvedValue({ error: null });
  auth.updateUser.mockResolvedValue({ error: null });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  history.replaceState({}, '', '/');
});
function openAccount() {
  return render(
    <AccountProvider>
      <AccountPanel profile={profile} onSaved={vi.fn()} onGuest={vi.fn()} />
    </AccountProvider>,
  );
}
async function fillSignIn(container) {
  await screen.findByRole('heading', { name: 'Welcome back.' });
  fireEvent.change(screen.getByLabelText('Email address'), { target: { value: user.email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'example-password' } });
  fireEvent.submit(container.querySelector('form'));
}

describe('account flow', () => {
  it('updates the account after successful sign-in and returns to sign-in after sign-out', async () => {
    auth.signInWithPassword.mockImplementationOnce(async () => {
      auth.onAuthStateChange.mock.calls[0][0]('SIGNED_IN', { user });
      return { error: null };
    });
    auth.signOut.mockImplementationOnce(async () => {
      auth.onAuthStateChange.mock.calls[0][0]('SIGNED_OUT', null);
      return { error: null };
    });
    const { container } = openAccount();
    await fillSignIn(container);
    await screen.findByRole('heading', { name: 'You’re ready to go.' });
    expect(screen.getByText(user.email)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
    await screen.findByRole('heading', { name: 'Welcome back.' });
    expect(screen.getByLabelText('Password').value).toBe('');
    expect(auth.signOut).toHaveBeenCalledOnce();
  });
  it('offers resend and email verification when sign-in is blocked by an unconfirmed email', async () => {
    auth.signInWithPassword.mockResolvedValueOnce({
      error: { code: 'email_not_confirmed', message: 'Email not confirmed' },
    });
    const { container } = openAccount();
    await fillSignIn(container);
    await screen.findByRole('heading', { name: 'Confirm your email.' });
    expect(screen.getByRole('alert').textContent).toMatch(/Confirm your email before signing in/);
    fireEvent.click(screen.getByRole('button', { name: 'Resend confirmation email' }));
    await screen.findByRole('status');
    expect(auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: user.email,
      options: { emailRedirectTo: `${location.origin}/auth/confirm` },
    });
    expect(screen.getByRole('button', { name: /Resend available/ }).disabled).toBe(true);
    fireEvent.change(screen.getByLabelText('Email code'), { target: { value: '123456' } });
    fireEvent.submit(container.querySelector('form'));
    await screen.findByText('Your email is confirmed. You can now sign in.');
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: user.email,
      token: '123456',
      type: 'email',
    });
    expect(auth.signUp).not.toHaveBeenCalled();
  });
  it('lets a user finish password recovery with an email code without a browser URL grant', async () => {
    const { container } = openAccount();
    await screen.findByRole('heading', { name: 'Welcome back.' });
    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    fireEvent.change(screen.getByLabelText('Email address'), { target: { value: user.email } });
    fireEvent.submit(container.querySelector('form'));
    await screen.findByRole('heading', { name: 'Check your reset email.' });
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith(user.email, {
      redirectTo: `${location.origin}/auth/recovery`,
    });
    fireEvent.change(screen.getByLabelText('Email code'), { target: { value: '654321' } });
    fireEvent.submit(container.querySelector('form'));
    await screen.findByRole('heading', { name: 'Choose a new password.' });
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: user.email,
      token: '654321',
      type: 'recovery',
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'new-example-password' },
    });
    fireEvent.submit(container.querySelector('form'));
    await screen.findByText('Your password has been updated.');
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'new-example-password' });
  });
  it('shows an expired-link error and removes grant details without losing unrelated navigation', async () => {
    history.replaceState(
      {},
      '',
      '/auth/confirm?ref=poster#error=access_denied&error_code=otp_expired&error_description=Email+link+expired',
    );
    openAccount();
    expect((await screen.findByRole('alert')).textContent).toMatch(/expired or was already used/);
    await waitFor(() => expect(location.hash).toBe(''));
    expect(location.search).toBe('?ref=poster');
    expect(
      screen.getByRole('button', { name: 'Confirm email or resend confirmation' }),
    ).toBeTruthy();
  });
  it('reports a PKCE link opened without the original verifier instead of silently returning a guest session', async () => {
    history.replaceState({}, '', '/auth/confirm?code=test-grant');
    openAccount();
    expect((await screen.findByRole('alert')).textContent).toMatch(
      /browser where you requested it/,
    );
    await waitFor(() => expect(location.search).toBe(''));
  });
  it('reports SDK initialization failures even when getSession has no error', async () => {
    auth.initialize.mockResolvedValueOnce({ error: { message: 'Failed to fetch' } });
    openAccount();
    expect((await screen.findByRole('alert')).textContent).toMatch(
      /account server could not be reached/,
    );
    expect(screen.getByRole('button', { name: 'Continue as guest' })).toBeTruthy();
  });
  it('opens the new-password form when the SDK recovery event happened before subscription', async () => {
    history.replaceState({}, '', '/auth/recovery?code=test-grant');
    auth.initialize.mockImplementationOnce(async () => {
      history.replaceState({}, '', '/auth/recovery');
      return { error: null };
    });
    auth.getSession.mockResolvedValueOnce({ data: { session: { user } }, error: null });
    openAccount();
    await screen.findByRole('heading', { name: 'Choose a new password.' });
  });
  it('keeps an existing session out of recovery after a failed password-reset callback', async () => {
    history.replaceState({}, '', '/auth/recovery?code=expired-grant');
    auth.initialize.mockResolvedValueOnce({
      error: { code: 'flow_state_expired', message: 'Flow expired' },
    });
    auth.getSession.mockResolvedValueOnce({ data: { session: { user } }, error: null });
    openAccount();
    await screen.findByRole('heading', { name: 'You’re ready to go.' });
    expect(screen.queryByLabelText('Password')).toBeNull();
    expect(screen.getByRole('alert').textContent).toMatch(/expired link/);
  });
  it('does not treat a bookmarked recovery URL as a newly verified password reset', async () => {
    history.replaceState({}, '', '/auth/recovery');
    auth.getSession.mockResolvedValueOnce({ data: { session: { user } }, error: null });
    openAccount();
    await screen.findByRole('heading', { name: 'You’re ready to go.' });
    expect(screen.queryByLabelText('Password')).toBeNull();
    expect(screen.queryByText('Your email is confirmed. You’re signed in.')).toBeNull();
  });
  it('does not call the server when signing in offline', async () => {
    const online = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { container } = openAccount();
    await fillSignIn(container);
    expect((await screen.findByRole('alert')).textContent).toMatch(/You’re offline/);
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
    online.mockRestore();
  });
});

// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../src/App';
import AccountPanel from '../src/components/AccountPanel';

const auth = vi.hoisted(() => ({ signInWithPassword: vi.fn(), signUp: vi.fn() }));
vi.mock('../src/services/auth', () => ({ getAuthClient: async () => ({ auth }) }));

const stops = [
  { id: 1, name: 'Terminal B - Lower Level', lat: 33.94, lon: -118.4 },
  { id: 2, name: 'Terminal 3 - Lower Level', lat: 33.95, lon: -118.4 },
  { id: 3, name: 'South Lot Stop #1', lat: 33.95, lon: -118.39 },
];
vi.mock('../src/hooks/useAccount', () => ({
  useAccount: () => ({ user: null, ready: true, recovering: false }),
}));
vi.mock('../src/hooks/useShuttle', () => ({
  useRoute: () => ({
    data: { stops, paths: [] },
    refetch: vi.fn(),
    isPending: false,
    isError: false,
  }),
  useLive: () => ({
    data: undefined,
    refetch: vi.fn(),
    isPending: false,
    isError: false,
    isFetching: false,
  }),
  useOnline: () => true,
  useSnapshotFresh: () => false,
}));
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [false, vi.fn()], updateServiceWorker: vi.fn() }),
}));
vi.mock('../src/components/AppleMap', () => ({ default: () => <div aria-label="Apple map" /> }));
beforeEach(() => {
  auth.signInWithPassword.mockReset().mockResolvedValue({ error: null });
  auth.signUp.mockReset().mockResolvedValue({ data: { session: null }, error: null });
  localStorage.clear();
  window.matchMedia = vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(cleanup);
describe('commute UI', () => {
  it('shows a return-to-parking flow and preserves the usual terminal after a daily override', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Go home' }));
    const boarding = screen.getByRole('combobox', { name: 'Boarding stop for this trip' });
    expect(boarding.value).toBe('1');
    fireEvent.change(boarding, { target: { value: '2' } });
    expect(boarding.value).toBe('2');
    expect(screen.getByText(/Today’s stop/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'My commute' }));
    const saved = await screen.findByRole('combobox', { name: 'Usual terminal' });
    expect(saved.value).toBe('Terminal B (TBIT)');
    expect(localStorage.getItem('laxcommute:profile:guest')).toBeNull();
  });
  it('uses DaisyUI components for buttons, forms, and installation help', async () => {
    render(<App />);
    await screen.findByRole('combobox', { name: 'Boarding stop for this trip' });
    for (const button of screen.getAllByRole('button'))
      expect(button.classList.contains('btn')).toBe(true);
    expect(
      screen
        .getByRole('combobox', { name: 'Boarding stop for this trip' })
        .classList.contains('select'),
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Add to home screen' }));
    expect(screen.getByRole('dialog', { name: 'Your commute, one tap away.' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
  it('saves exact boarding stops for a guest without requiring sign-in', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'My commute' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Save my commute' }));
    await screen.findByText('Saved on this device.', { selector: '[role="status"]' });
    const stored = JSON.parse(localStorage.getItem('laxcommute:profile:guest'));
    expect(stored.terminalStopID).toBe(1);
    expect(stored.parkingStopID).toBe(3);
  });
  it('submits sign-in credentials and shows a server error', async () => {
    auth.signInWithPassword.mockResolvedValueOnce({
      error: { message: 'Invalid login credentials' },
    });
    const { container } = render(
      <AccountPanel profile={{ lot: 'South', terminal: 'Terminal B (TBIT)' }} />,
    );
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'employee@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'example-password' } });
    fireEvent.click(container.querySelector('form button[type="submit"]'));
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Invalid login credentials',
    );
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'employee@example.com',
      password: 'example-password',
    });
  });
  it('creates an account with the current commute and the current site confirmation URL', async () => {
    const profile = { lot: 'South', terminal: 'Terminal B (TBIT)' };
    const { container } = render(<AccountPanel profile={profile} />);
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    fireEvent.change(screen.getByLabelText('Email address'), {
      target: { value: 'employee@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'example-password' } });
    fireEvent.click(container.querySelector('form button[type="submit"]'));
    await screen.findByText('Check your email to confirm your account, then sign in here.');
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'employee@example.com',
      password: 'example-password',
      options: { emailRedirectTo: `${location.origin}/`, data: { commute: profile } },
    });
  });
});

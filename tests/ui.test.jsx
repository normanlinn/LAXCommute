// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import App from '../src/App';
import { ThemeProvider } from '../src/theme/ThemeProvider';
import AccountPanel from '../src/components/AccountPanel';
import LanguageSwitch from '../src/components/LanguageSwitch';
import { LanguageProvider } from '../src/i18n/LanguageProvider';

const liveRequests = vi.hoisted(() => vi.fn());
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
  useRoute: (routeID) => ({
    data: {
      stops:
        routeID === 6885
          ? stops
          : [
              ...stops,
              {
                id: 4,
                name: `${routeID === 6884 ? 'East' : 'West'} Lot Stop #1`,
                lat: 33.95,
                lon: -118.39,
              },
            ],
      paths: [],
    },
    refetch: vi.fn(),
    isPending: false,
    isError: false,
  }),
  useLive: (...args) => {
    liveRequests(...args);
    return {
      data: undefined,
      refetch: vi.fn(),
      isPending: false,
      isError: false,
      isFetching: false,
    };
  },
  useOnline: () => true,
  useSnapshotFresh: () => false,
}));
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: () => ({ needRefresh: [false, vi.fn()], updateServiceWorker: vi.fn() }),
}));
vi.mock('../src/components/ShuttleMap', () => ({
  default: () => <div aria-label="Shuttle map" />,
}));
beforeEach(() => {
  auth.signInWithPassword.mockReset().mockResolvedValue({ error: null });
  auth.signUp.mockReset().mockResolvedValue({ data: { session: null }, error: null });
  localStorage.clear();
  sessionStorage.clear();
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
  it('keeps the East route and a South Lot override when switching languages', () => {
    render(
      <LanguageProvider>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </LanguageProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /^E\s*East$/ }));
    const boarding = screen.getByRole('combobox', { name: 'Where are you boarding?' });
    fireEvent.change(boarding, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.dataset.theme).toBe('lax-dark');
    expect(boarding.value).toBe('3');
    fireEvent.click(screen.getByRole('button', { name: 'မြန်မာ' }));
    expect(boarding.value).toBe('3');
    expect(boarding.selectedOptions[0].textContent).toBe('South Lot Stop #1');
    expect(screen.getByRole('combobox', { name: 'ဘယ်မှတ်တိုင်မှ စီးမလဲ။' })).toBe(boarding);
    expect(liveRequests).toHaveBeenLastCalledWith(6884, 3, true);
    expect(localStorage.getItem('laxcommute:profile:guest')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(screen.getByRole('combobox', { name: 'Where are you boarding?' })).toBe(boarding);
    expect(boarding.value).toBe('3');
  });
  it('preserves account input and translates a sign-in error after switching languages', async () => {
    auth.signInWithPassword.mockResolvedValueOnce({
      error: { message: 'Invalid login credentials' },
    });
    const { container } = render(
      <LanguageProvider>
        <LanguageSwitch />
        <AccountPanel profile={{ lot: 'South', terminal: 'Terminal B (TBIT)' }} />
      </LanguageProvider>,
    );
    const email = screen.getByLabelText('Email address');
    const password = screen.getByLabelText('Password');
    fireEvent.change(email, { target: { value: 'employee@example.com' } });
    fireEvent.change(password, { target: { value: 'example-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'မြန်မာ' }));
    expect(screen.getByLabelText('အီးမေးလ်လိပ်စာ')).toBe(email);
    expect(screen.getByLabelText('စကားဝှက်')).toBe(password);
    expect(email.value).toBe('employee@example.com');
    expect(password.value).toBe('example-password');
    fireEvent.submit(container.querySelector('form'));
    const error = await screen.findByRole('alert');
    expect(error.textContent).toContain('အီးမေးလ်');
    expect(error.textContent).not.toContain('The email or password is incorrect');
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    expect(error.textContent).toBe(
      'The email or password is incorrect. Try again or use Forgot password.',
    );
  });
  it('offers walking directions to the currently selected stop in Apple or Google Maps', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Go home' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Where are you boarding?' }), {
      target: { value: '2' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Directions to this stop' }));
    expect(screen.getByRole('dialog', { name: 'Open directions' })).toBeTruthy();
    const apple = new URL(screen.getByRole('link', { name: 'Apple Maps' }).href);
    const google = new URL(screen.getByRole('link', { name: 'Google Maps' }).href);
    expect(apple.searchParams.get('daddr')).toBe('33.95,-118.4');
    expect(apple.searchParams.get('dirflg')).toBe('w');
    expect(google.searchParams.get('destination')).toBe('33.95,-118.4');
    expect(google.searchParams.get('travelmode')).toBe('walking');
    fireEvent.click(screen.getByRole('button', { name: 'Close directions' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
  it('shows a return-to-parking flow and preserves the usual terminal after a daily override', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Go home' }));
    const boarding = screen.getByRole('combobox', { name: 'Where are you boarding?' });
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
    fireEvent.click(screen.getByRole('button', { name: 'Explore first' }));
    await screen.findByRole('combobox', { name: 'Where are you boarding?' });
    for (const button of screen.getAllByRole('button'))
      expect(button.classList.contains('btn')).toBe(true);
    expect(
      screen
        .getByRole('combobox', { name: 'Where are you boarding?' })
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
      'The email or password is incorrect. Try again or use Forgot password.',
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
    await screen.findByText(
      'Check your email. Open the confirmation link in this browser, or enter the code if your email includes one.',
    );
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'employee@example.com',
      password: 'example-password',
      options: { emailRedirectTo: `${location.origin}/auth/confirm`, data: { commute: profile } },
    });
  });
});

it.each([
  ['East', 6884],
  ['West', 6883],
])('requests %s arrivals at the selected South boarding stop', async (lot, routeID) => {
  render(<App />);
  fireEvent.click(screen.getByRole('button', { name: new RegExp(`^[EW]\\s*${lot}$`) }));
  const select = screen.getByRole('combobox', { name: 'Where are you boarding?' });
  expect(select.value).toBe('4');
  fireEvent.change(select, { target: { value: '3' } });
  expect(select.value).toBe('3');
  expect(liveRequests).toHaveBeenLastCalledWith(routeID, 3, true);
  expect(localStorage.getItem('laxcommute:profile:guest')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Usual stop' }));
  expect(select.value).toBe('4');
});

it('exposes the selected travel direction when the user changes it', () => {
  render(
    <ThemeProvider>
      <App />
    </ThemeProvider>,
  );
  expect(screen.getByRole('button', { name: 'To work', pressed: true })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'To parking', pressed: false }));
  expect(screen.getByRole('button', { name: 'To parking', pressed: true })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'To work', pressed: false })).toBeTruthy();
});
it('exposes the selected account option when switching to create account', () => {
  render(<AccountPanel />);
  expect(screen.getByRole('button', { name: 'Sign in', pressed: true })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Create account', pressed: false }));
  expect(screen.getByRole('button', { name: 'Create account', pressed: true })).toBeTruthy();
  expect(screen.getByRole('button', { name: 'Sign in', pressed: false })).toBeTruthy();
});

it('guides a first visit into commute setup and restores remembered choices on reopening', async () => {
  const first = render(<App />);
  expect(screen.getByRole('dialog', { name: 'Make this your commute.' })).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Set up my commute' }));
  const terminal = await screen.findByRole('combobox', { name: 'Usual terminal' });
  fireEvent.change(terminal, { target: { value: 'Terminal 3' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save my commute' }));
  await screen.findByText('Saved on this device.');
  first.unmount();
  render(<App />);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect((await screen.findByRole('combobox', { name: 'Usual terminal' })).value).toBe(
    'Terminal 3',
  );
});
it('dismisses the introduction for later visits without inventing a saved commute', () => {
  const first = render(<App />);
  fireEvent.click(screen.getByRole('button', { name: 'Explore first' }));
  expect(localStorage.getItem('laxcommute:profile:guest')).toBeNull();
  first.unmount();
  render(<App />);
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(screen.getByRole('button', { name: 'Explore' }).getAttribute('aria-current')).toBe('page');
});

// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import AppMenu from '../src/components/AppMenu';

let query;
let change;
function Subject() {
  const { appearance } = useTheme();
  return (
    <>
      <AppMenu />
      <output>{appearance}</output>
    </>
  );
}
function open() {
  const view = render(
    <ThemeProvider>
      <Subject />
    </ThemeProvider>,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
  return view;
}
beforeEach(() => {
  localStorage.clear();
  query = {
    matches: false,
    addEventListener: vi.fn((_, listener) => {
      change = listener;
    }),
    removeEventListener: vi.fn(),
  };
  window.matchMedia = vi.fn(() => query);
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  document.documentElement.dataset.theme = 'lax';
  document.documentElement.style.colorScheme = 'light';
});
describe('appearance menu', () => {
  it('follows device changes by default, honors manual choices, and returns to System', () => {
    const view = open();
    expect(screen.getByRole('radio', { name: 'System' }).checked).toBe(true);
    act(() => {
      query.matches = true;
      change();
    });
    expect(document.documentElement.dataset.theme).toBe('lax-dark');
    fireEvent.click(screen.getByRole('radio', { name: 'Light' }));
    expect(document.documentElement.style.colorScheme).toBe('light');
    act(() => {
      query.matches = false;
      change();
      query.matches = true;
      change();
    });
    expect(document.documentElement.dataset.theme).toBe('lax');
    fireEvent.click(screen.getByRole('radio', { name: 'System' }));
    expect(document.documentElement.dataset.theme).toBe('lax-dark');
    view.unmount();
    expect(query.removeEventListener).toHaveBeenCalledWith('change', change);
  });
  it('remembers Dark after reopening, and closes the menu with Escape', () => {
    const view = open();
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(localStorage.getItem('laxcommute:theme')).toBe('dark');
    fireEvent(screen.getByRole('dialog'), new Event('cancel', { bubbles: true, cancelable: true }));
    expect(screen.getByRole('button', { name: 'Open menu' }).getAttribute('aria-expanded')).toBe(
      'false',
    );
    view.unmount();
    open();
    expect(screen.getByRole('radio', { name: 'Dark' }).checked).toBe(true);
    expect(document.documentElement.dataset.theme).toBe('lax-dark');
  });
  it('works when storage is blocked and treats invalid preferences as System', () => {
    localStorage.setItem('laxcommute:theme', 'invalid');
    const first = open();
    expect(screen.getByRole('radio', { name: 'System' }).checked).toBe(true);
    first.unmount();
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw Error('blocked');
    });
    open();
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement.dataset.theme).toBe('lax-dark');
  });
  it.each([
    ['system', true, 'lax-dark'],
    ['light', true, 'lax'],
    ['dark', false, 'lax-dark'],
    ['invalid', false, 'lax'],
  ])('sets the correct theme before React starts (%s)', (saved, dark, expected) => {
    localStorage.setItem('laxcommute:theme', saved);
    query.matches = dark;
    window.eval(readFileSync('public/theme.js', 'utf8'));
    expect(document.documentElement.dataset.theme).toBe(expected);
    render(
      <ThemeProvider>
        <Subject />
      </ThemeProvider>,
    );
    expect(document.documentElement.dataset.theme).toBe(expected);
  });
});

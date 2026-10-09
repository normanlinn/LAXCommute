// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import ShareApp, { APP_SHARE_URL } from '../src/components/ShareApp';

beforeEach(() => {
  Object.defineProperty(navigator, 'share', { configurable: true, get: () => undefined });
  Object.defineProperty(navigator, 'clipboard', { configurable: true, get: () => undefined });
  window.matchMedia = vi.fn(() => ({ matches: true }));
  HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('shares only the public app link, without account or commute data', async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  vi.spyOn(navigator, 'share', 'get').mockReturnValue(share);
  render(<ShareApp />);
  fireEvent.click(screen.getByRole('button', { name: 'Share app' }));
  expect(share).toHaveBeenCalledWith({
    title: 'LAXCommute',
    text: expect.any(String),
    url: APP_SHARE_URL,
  });
});
it('offers a copyable link when native sharing is unavailable', async () => {
  vi.spyOn(navigator, 'share', 'get').mockReturnValue(undefined);
  const writeText = vi.fn().mockResolvedValue(undefined);
  vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({ writeText });
  render(<ShareApp />);
  fireEvent.click(screen.getByRole('button', { name: 'Share app' }));
  expect(screen.getByLabelText('App link').value).toBe(APP_SHARE_URL);
  fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
  await screen.findByText('Link copied.');
  expect(writeText).toHaveBeenCalledWith(APP_SHARE_URL);
});
it('does not open another popup after cancelling the share sheet', async () => {
  vi.spyOn(navigator, 'share', 'get').mockReturnValue(
    vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError')),
  );
  render(<ShareApp />);
  fireEvent.click(screen.getByRole('button', { name: 'Share app' }));
  await Promise.resolve();
  expect(screen.queryByRole('dialog')).toBeNull();
});
it('keeps manual copying available when clipboard access is blocked', async () => {
  vi.spyOn(navigator, 'share', 'get').mockReturnValue(undefined);
  vi.spyOn(navigator, 'clipboard', 'get').mockReturnValue({
    writeText: vi.fn().mockRejectedValue(new Error('Denied')),
  });
  render(<ShareApp />);
  fireEvent.click(screen.getByRole('button', { name: 'Share app' }));
  fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));
  await screen.findByText('Select the link above and copy it manually.');
  expect(screen.getByLabelText('App link').value).toBe(APP_SHARE_URL);
});

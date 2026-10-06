// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { readCommuteSettings, useCommute } from '../src/hooks/useCommute';
vi.mock('../src/hooks/useAccount', () => ({
  useAccount: () => ({ user: null, ready: true }),
}));
const commute = {
  lot: 'East',
  terminal: 'Terminal 3',
  parkingStopID: 12,
  terminalStopID: 34,
};
beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
it('restores remembered lot, terminal and exact boarding stops', async () => {
  expect(readCommuteSettings().hasSaved).toBe(false);
  const first = renderHook(useCommute);
  await act(() => first.result.current.save(commute, true));
  first.unmount();
  const next = renderHook(useCommute);
  expect(next.result.current.profile).toMatchObject(commute);
  expect(next.result.current.hasSaved).toBe(true);
  expect(next.result.current.remember).toBe(true);
});
it('removes the previous persistent choice when remembering is disabled', async () => {
  localStorage.setItem('laxcommute:profile:guest', JSON.stringify(commute));
  const view = renderHook(useCommute);
  await act(() => view.result.current.save({ ...commute, lot: 'West' }, false));
  expect(localStorage.getItem('laxcommute:profile:guest')).toBeNull();
  expect(readCommuteSettings().profile.lot).toBe('West');
  expect(readCommuteSettings().remember).toBe(false);
  sessionStorage.clear();
  expect(readCommuteSettings().hasSaved).toBe(false);
});
it('keeps choices in memory and reports when browser storage is blocked', async () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  const view = renderHook(useCommute);
  await act(() => view.result.current.save(commute));
  expect(view.result.current.profile).toMatchObject(commute);
  expect(view.result.current.saveState).toContain('Browser storage is unavailable');
  expect(view.result.current.remember).toBe(false);
});
it('does not treat corrupt or invalid browser data as a configured commute', () => {
  localStorage.setItem('laxcommute:profile:guest', '{');
  expect(readCommuteSettings().hasSaved).toBe(false);
  localStorage.setItem('laxcommute:profile:guest', JSON.stringify({ lot: 'Unknown' }));
  expect(readCommuteSettings().hasSaved).toBe(false);
});

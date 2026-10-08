// @vitest-environment jsdom
import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { useCommute } from '../src/hooks/useCommute';
const mocks = vi.hoisted(() => ({ user: null, load: vi.fn(), save: vi.fn() }));
vi.mock('../src/hooks/useAccount', () => ({
  useAccount: () => ({ user: mocks.user, ready: true }),
}));
vi.mock('../src/services/commute', () => ({
  loadAccountCommute: mocks.load,
  saveAccountCommute: mocks.save,
}));
const legacy = { lot: 'East', terminal: 'Terminal 3' };
const remote = { ...legacy, lot: 'West', terminal: 'Terminal 4' };
beforeEach(() => {
  vi.resetAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  mocks.user = { id: 'employee-one', user_metadata: { commute: legacy } };
  mocks.load.mockResolvedValue(null);
  mocks.save.mockResolvedValue(undefined);
});
afterEach(cleanup);
it('restores database settings ahead of old account metadata', async () => {
  mocks.load.mockResolvedValue(remote);
  const view = renderHook(useCommute);
  await waitFor(() => expect(view.result.current.profile.lot).toBe('West'));
  expect(view.result.current.hasSaved).toBe(true);
});
it('preserves legacy settings until the first database save', async () => {
  const view = renderHook(useCommute);
  await waitFor(() => expect(mocks.load).toHaveBeenCalled());
  expect(view.result.current.profile).toMatchObject(legacy);
  await act(() => view.result.current.save(remote));
  expect(mocks.save).toHaveBeenCalledWith('employee-one', expect.objectContaining(remote));
  expect(view.result.current.saveState).toBe('Saved to your account.');
});
it('does not claim a failed account save succeeded or overwrite the cached settings', async () => {
  mocks.save.mockRejectedValue(new Error('offline'));
  const view = renderHook(useCommute);
  await act(async () => {
    await expect(view.result.current.save(remote)).rejects.toThrow('offline');
  });
  expect(view.result.current.profile).toMatchObject(legacy);
  expect(view.result.current.saveState).toContain('Could not save');
  expect(localStorage.getItem('laxcommute:profile:employee-one')).toBeNull();
});
it('ignores an old account load after sign-out', async () => {
  let resolve;
  mocks.load.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const view = renderHook(useCommute);
  mocks.user = null;
  view.rerender();
  await act(async () => resolve(remote));
  expect(view.result.current.profile.lot).toBe('South');
  expect(view.result.current.hasSaved).toBe(false);
});
it('ignores a slow load that finishes after a new save', async () => {
  let resolve;
  mocks.load.mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const view = renderHook(useCommute);
  await act(() => view.result.current.save(remote));
  await act(async () => resolve(legacy));
  expect(view.result.current.profile).toMatchObject(remote);
});

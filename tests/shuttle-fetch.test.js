import { afterEach, expect, it, vi } from 'vitest';
import { getRoute, getLive, SHUTTLE_REQUEST_TIMEOUT_MS } from '../src/services/shuttle';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function stalledFetch() {
  return vi.fn(
    (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        const abort = () => reject(new DOMException('Aborted', 'AbortError'));
        if (signal.aborted) abort();
        else signal.addEventListener('abort', abort, { once: true });
      }),
  );
}
it.each([() => getRoute(6884), () => getLive(6884, 101)])(
  'ends a stalled East request with a retryable timeout',
  async (request) => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', stalledFetch());
    const result = expect(request()).rejects.toThrow(
      'The shuttle request timed out. Please retry.',
    );
    await vi.advanceTimersByTimeAsync(SHUTTLE_REQUEST_TIMEOUT_MS);
    await result;
    expect(vi.getTimerCount()).toBe(0);
  },
);
it('cancels the previous request immediately when switching routes', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', stalledFetch());
  const controller = new AbortController();
  const result = expect(getRoute(6884, controller.signal)).rejects.toMatchObject({
    name: 'AbortError',
  });
  controller.abort();
  await result;
  expect(vi.getTimerCount()).toBe(0);
});
it('covers a stalled response body with the same deadline', async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url, { signal }) => ({
      ok: true,
      json: () =>
        new Promise((_resolve, reject) =>
          signal.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          ),
        ),
    })),
  );
  const result = expect(getRoute(6884)).rejects.toThrow('timed out');
  await vi.advanceTimersByTimeAsync(SHUTTLE_REQUEST_TIMEOUT_MS);
  await result;
  expect(vi.getTimerCount()).toBe(0);
});
it('removes the timeout after successful geometry loading', async () => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ stops: [], patterns: [], warning: null })),
  );
  expect(await getRoute(6884)).toEqual({ stops: [], paths: [], warning: null });
  expect(vi.getTimerCount()).toBe(0);
});

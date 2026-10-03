import { afterEach, expect, it, vi } from 'vitest';
import { authFetch, AUTH_REQUEST_TIMEOUT_MS } from '../src/services/authFetch';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function abortableFetch() {
  return vi.fn(
    (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        const abort = () => reject(new DOMException('Request aborted', 'AbortError'));
        if (signal.aborted) abort();
        else signal.addEventListener('abort', abort, { once: true });
      }),
  );
}
it('aborts a stalled account request so the form can return an error', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', abortableFetch());
  const result = expect(authFetch('https://auth.example.com')).rejects.toMatchObject({
    name: 'AbortError',
  });
  await vi.advanceTimersByTimeAsync(AUTH_REQUEST_TIMEOUT_MS);
  await result;
  expect(vi.getTimerCount()).toBe(0);
});
it('preserves caller cancellation rather than waiting for the account timeout', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', abortableFetch());
  const controller = new AbortController();
  const result = expect(
    authFetch('https://auth.example.com', { signal: controller.signal }),
  ).rejects.toMatchObject({ name: 'AbortError' });
  controller.abort();
  await result;
  expect(vi.getTimerCount()).toBe(0);
});

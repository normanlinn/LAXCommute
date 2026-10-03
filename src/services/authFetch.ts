// Bound account requests so a lost connection does not leave forms waiting indefinitely.
// Preserve cancellation requested by the SDK/caller as well.
export const AUTH_REQUEST_TIMEOUT_MS = 15_000;
export async function authFetch(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController();
  const original = init?.signal || (input instanceof Request ? input.signal : undefined);
  const cancel = () => controller.abort();
  original?.addEventListener('abort', cancel, { once: true });
  if (original?.aborted) cancel();
  const timer = setTimeout(cancel, AUTH_REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    original?.removeEventListener('abort', cancel);
  }
}

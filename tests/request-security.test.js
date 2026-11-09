import { afterEach, expect, it, vi } from 'vitest';
import { readLimitedText } from '../supabase/functions/_shared/request-body';
import worker from '../worker/index';
import { validSubscription, base64url } from '../worker/push';
import { parseAlertRequest } from '../worker/alerts';
import { feedRequest, cachedFeed } from '../worker/feed';

afterEach(() => vi.useRealTimers());
function chunked(chunks) {
  return new Request('https://app.test', {
    method: 'POST',
    duplex: 'half',
    body: new ReadableStream({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(new TextEncoder().encode(chunk));
        controller.close();
      },
    }),
  });
}
it('limits actual UTF-8 bytes on chunked requests without a content-length', async () => {
  await expect(readLimitedText(chunked(['abc', 'def']), 5)).rejects.toMatchObject({ status: 413 });
  await expect(readLimitedText(chunked(['မြန်မာ']), 5)).rejects.toMatchObject({ status: 413 });
  expect(await readLimitedText(chunked(['{"a":', '1}']))).toBe('{"a":1}');
});
it('rejects advertised oversized input without consuming it', async () => {
  const request = new Request('https://app.test', {
    method: 'POST',
    headers: { 'Content-Length': '1000000' },
    body: 'x',
  });
  await expect(readLimitedText(request)).rejects.toMatchObject({ status: 413 });
  expect(request.bodyUsed).toBe(false);
});
it('cancels a stalled request body and clears its deadline', async () => {
  vi.useFakeTimers();
  const cancel = vi.fn();
  const request = new Request('https://app.test', {
    method: 'POST',
    duplex: 'half',
    body: new ReadableStream({ cancel }),
  });
  const rejected = expect(readLimitedText(request, 4096, 100)).rejects.toMatchObject({
    status: 408,
  });
  await vi.advanceTimersByTimeAsync(101);
  await rejected;
  expect(cancel).toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});
it('never puts the provider key in a URL', () => {
  const request = feedRequest('routes/6884/vehicles', 'private-test-key');
  expect(request.url).not.toContain('private-test-key');
  expect(request.headers['Api-Key']).toBe('private-test-key');
});
it('does not forward a provider key through redirects', async () => {
  const fetcher = vi.fn(async () => Response.json([]));
  await cachedFeed('routes/6884/vehicles', 15, { apiKey: 'private-test-key', fetcher });
  expect(fetcher.mock.calls[0][1].redirect).toBe('error');
});
it('prevents push-service URL tricks and invalid route alerts', () => {
  const subscription = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/test',
    keys: { p256dh: base64url(new Uint8Array(65)), auth: base64url(new Uint8Array(16)) },
  };
  expect(validSubscription(subscription)).toBe(true);
  for (const endpoint of [
    'http://fcm.googleapis.com/x',
    'https://user:pass@fcm.googleapis.com/x',
    'https://fcm.googleapis.com:8443/x',
    'https://fcm.googleapis.com/x#fragment',
    'https://fcm.googleapis.com.evil.test/x',
    'https://127.0.0.1/x',
  ]) {
    expect(validSubscription({ ...subscription, endpoint })).toBe(false);
  }
  expect(
    parseAlertRequest({
      subscription,
      routeID: 9999,
      stopID: 1,
      vehicleID: 2,
      title: 'Test',
      body: 'Test',
    }),
  ).toBeNull();
});
it('hardens early error responses and restricts expensive alert creation independently', async () => {
  const rateLimit = vi.fn(async () => ({ success: false }));
  const result = await worker.fetch(
    new Request('https://employeeshuttlelax.com/api/alerts', {
      method: 'POST',
      headers: { 'CF-Connecting-IP': '192.0.2.1' },
      body: '{}',
    }),
    { ALERT_RATE_LIMITER: { limit: rateLimit } },
  );
  expect(result.status).toBe(429);
  expect(result.headers.get('cache-control')).toBe('no-store');
  expect(result.headers.get('strict-transport-security')).toContain('max-age=31536000');
  expect(result.headers.get('content-security-policy')).toContain("default-src 'none'");
  expect(rateLimit).toHaveBeenCalledOnce();
});

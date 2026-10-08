import { expect, it } from 'vitest';
import { feedCaching as caching } from '../scripts/feed-cache.mjs';
const live = caching.find((r) => r.options.cacheName === 'laxcommute-live-v1');
const policy = live.options.plugins[0];
it('caches only public route and live endpoints with bounded retention', () => {
  expect(
    live.urlPattern({
      url: new URL('https://employeeshuttlelax.com/api/live/6884?stopId=123'),
      sameOrigin: true,
    }),
  ).toBe(true);
  expect(
    live.urlPattern({
      url: new URL('https://employeeshuttlelax.com/api/auth/6884'),
      sameOrigin: true,
    }),
  ).toBe(false);
  expect(live.options.networkTimeoutSeconds).toBe(8);
  expect(live.options.expiration.maxEntries).toBe(24);
});
it('falls back on upstream errors and does not replace good snapshots with partial failures', async () => {
  await expect(
    policy.fetchDidSucceed({ response: new Response('', { status: 502 }) }),
  ).rejects.toThrow();
  expect(
    await policy.cacheWillUpdate({
      response: Response.json({ warnings: ['Arrival times unavailable.'] }),
    }),
  ).toBeNull();
  expect(
    await policy.cacheWillUpdate({ response: Response.json({ warnings: [] }) }),
  ).toBeInstanceOf(Response);
});
it('labels a cache hit and keeps its source timestamp unchanged', async () => {
  const cachedResponse = Response.json({ arrivalFetchedAt: '2026-10-01T12:00:00Z' });
  const response = await policy.cachedResponseWillBeUsed({ cachedResponse });
  expect(response.headers.get('X-LAXCommute-Cached')).toBe('1');
  expect((await response.json()).arrivalFetchedAt).toBe('2026-10-01T12:00:00Z');
  expect(await policy.cachedResponseWillBeUsed({ cachedResponse: undefined })).toBeNull();
});

it('never caches another origin or private account endpoints', () => {
  for (const route of caching) {
    expect(
      route.urlPattern({ url: new URL('https://evil.test/api/live/6884'), sameOrigin: false }),
    ).toBe(false);
    expect(
      route.urlPattern({
        url: new URL('https://employeeshuttlelax.com/auth/confirm?code=private'),
        sameOrigin: true,
      }),
    ).toBe(false);
    expect(
      route.urlPattern({
        url: new URL('https://employeeshuttlelax.com/api/live/6884/extra'),
        sameOrigin: true,
      }),
    ).toBe(false);
  }
});

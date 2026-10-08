import { afterEach, expect, it, vi } from 'vitest';
import { cachedFeed, validFeed } from '../supabase/functions/_shared/feed.ts';
import { createEdgeHandler } from '../supabase/functions/_shared/edge-handler.ts';
import { createDeleteAccountHandler } from '../supabase/functions/_shared/delete-account.ts';
import worker from '../worker/index.ts';
import { supabaseSnapshot } from '../worker/supabase.ts';
const memory = () => {
  const data = new Map();
  return {
    match: async (key) => data.get(key.url)?.clone(),
    put: async (key, value) => data.set(key.url, value.clone()),
  };
};
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('serves the last good data with its original timestamp after exactly one retry', async () => {
  vi.useFakeTimers();
  const cache = memory();
  const fetcher = vi.fn(async () =>
    Response.json([{ id: 1, lat: 33.94, lon: -118.4, lastUpdated: new Date().toISOString() }]),
  );
  const first = await cachedFeed('routes/6884/vehicles', 15, {
    cache,
    fetcher,
    origin: 'https://stale.test',
  });
  await vi.advanceTimersByTimeAsync(16000);
  fetcher.mockImplementation(async () => new Response('', { status: 503 }));
  const stale = await cachedFeed('routes/6884/vehicles', 15, {
    cache,
    fetcher,
    origin: 'https://stale.test',
  });
  expect(stale.sourceUnavailable).toBe(true);
  expect(stale.fetchedAt).toBe(first.fetchedAt);
  expect(fetcher).toHaveBeenCalledTimes(3);
  await vi.advanceTimersByTimeAsync(300000);
  await expect(
    cachedFeed('routes/6884/vehicles', 15, { cache, fetcher, origin: 'https://stale.test' }),
  ).rejects.toThrow();
});
it('does not hit the source if another server already owns the refresh lease', async () => {
  vi.useFakeTimers();
  const cache = memory();
  const fetcher = vi.fn();
  await cache.put(
    new Request('https://lease.test/feed/routes%2F6884%2Fvehicles'),
    Response.json({ data: [], fetchedAt: new Date(Date.now() - 16000).toISOString() }),
  );
  const result = await cachedFeed('routes/6884/vehicles', 15, {
    cache,
    fetcher,
    origin: 'https://lease.test',
    claim: async () => false,
  });
  expect(result.sourceUnavailable).toBe(true);
  expect(fetcher).not.toHaveBeenCalled();
});
it('rejects feed format changes before they can reach rendering code', () => {
  expect(validFeed('routes/6884/vehicles', [{ id: 1, lat: 300, lon: 0, lastUpdated: 'bad' }])).toBe(
    false,
  );
  expect(
    validFeed('stops/1/arrivals?routeId=6884', [
      { secondsToArrival: 20, pattern: { directionType: 12 } },
    ]),
  ).toBe(false);
  expect(validFeed('routes/6884/stops', { results: [] })).toBe(false);
});
it('rejects foreign origins and missing application keys without touching the feed', async () => {
  const fetcher = vi.fn();
  const handle = createEdgeHandler('public-key', { fetcher });
  expect(
    (
      await handle(
        new Request('https://project.test/shuttle-feed/api/live/6884', {
          headers: { Origin: 'https://evil.test', apikey: 'public-key' },
        }),
      )
    ).status,
  ).toBe(403);
  expect(
    (await handle(new Request('https://project.test/shuttle-feed/api/live/6884'))).status,
  ).toBe(401);
  expect(fetcher).not.toHaveBeenCalled();
});
it('rate limits the real Cloudflare client IP before accessing the backend', async () => {
  const fetcher = vi.fn();
  vi.stubGlobal('fetch', fetcher);
  const limit = vi.fn(async () => ({ success: false }));
  const result = await worker.fetch(
    new Request('https://employeeshuttlelax.com/api/live/6884', {
      headers: { 'CF-Connecting-IP': '192.0.2.1' },
    }),
    { API_RATE_LIMITER: { limit } },
  );
  expect(result.status).toBe(429);
  expect(limit).toHaveBeenCalledWith({ key: '192.0.2.1' });
  expect(fetcher).not.toHaveBeenCalled();
});
it('production shuttle requests go to Supabase and preserve feed timestamps', async () => {
  const now = new Date().toISOString();
  const fetcher = vi.fn(async () =>
    Response.json({ vehicles: [], arrivals: [], vehicleFetchedAt: now, arrivalFetchedAt: now }),
  );
  const body = await supabaseSnapshot('live', 6883, 0, { fetcher });
  expect(fetcher.mock.calls[0][0]).toMatch(
    /^https:\/\/yzdoarjleozzblvsjbhx.supabase.co\/functions\/v1\/shuttle-feed\/api\/live/,
  );
  expect(body.arrivalFetchedAt).toBe(now);
});
it('account deletion derives the user ID from a validated session and revokes sessions first', async () => {
  const id = '11111111-1111-1111-1111-111111111111';
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ id, last_sign_in_at: new Date().toISOString() }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(Response.json({ id }));
  const handle = createDeleteAccountHandler('https://project.test', 'server-secret', fetcher);
  const result = await handle(
    new Request('https://project.test/delete-account', {
      method: 'POST',
      headers: { Authorization: 'Bearer user-token' },
      body: JSON.stringify({ user_id: 'someone-else' }),
    }),
  );
  expect(result.status).toBe(200);
  expect(fetcher.mock.calls[1][0]).toContain('/logout?scope=global');
  expect(fetcher.mock.calls[2][0]).toBe(`https://project.test/auth/v1/admin/users/${id}`);
});
it('account deletion refuses invalid or old sessions before admin access', async () => {
  const fetcher = vi.fn(async () =>
    Response.json({
      id: '11111111-1111-1111-1111-111111111111',
      last_sign_in_at: new Date(Date.now() - 3600000).toISOString(),
    }),
  );
  const result = await createDeleteAccountHandler(
    'https://project.test',
    'server-secret',
    fetcher,
  )(
    new Request('https://project.test/delete-account', {
      method: 'POST',
      headers: { Authorization: 'Bearer token' },
    }),
  );
  expect(result.status).toBe(403);
  expect(fetcher).toHaveBeenCalledTimes(1);
});

it('Supabase also rejects direct requests when its shared limiter blocks them', async () => {
  const fetcher = vi.fn();
  const result = await createEdgeHandler(
    'app-key',
    { fetcher },
    async () => false,
  )(
    new Request('https://project.test/shuttle-feed/api/live/6884', {
      headers: { apikey: 'app-key' },
    }),
  );
  expect(result.status).toBe(429);
  expect(fetcher).not.toHaveBeenCalled();
});

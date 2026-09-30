import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handleAPI } from '../worker/index';

function memoryCache() {
  const entries = new Map();
  return {
    match: async (key) => entries.get(key.url)?.clone(),
    put: async (key, value) => entries.set(key.url, value.clone()),
  };
}
describe('fixed-path shuttle gateway', () => {
  let options, fetcher;
  beforeEach(() => {
    fetcher = vi.fn(async (url) => {
      const path = new URL(url).searchParams.get('path');
      if (path.endsWith('/stops'))
        return Response.json([{ id: 101, lat: 33.94, lon: -118.4, name: 'Terminal B' }]);
      if (path.endsWith('/patterns')) return Response.json([{ id: 1, shape: '' }]);
      if (path.endsWith('/vehicles'))
        return Response.json([
          { id: 1, lat: 33.94, lon: -118.4, lastUpdated: new Date().toISOString() },
        ]);
      return Response.json([{ route: { id: 6884 }, secondsToArrival: 420 }]);
    });
    options = { cache: memoryCache(), fetcher };
  });
  it('rejects invalid routes and methods before requesting upstream', async () => {
    expect((await handleAPI(new Request('https://app.test/api/live/999'), options)).status).toBe(
      400,
    );
    expect(
      (await handleAPI(new Request('https://app.test/api/live/6884', { method: 'POST' }), options))
        .status,
    ).toBe(405);
    expect(
      (
        await handleAPI(
          new Request('https://app.test/api/live/6884?stopId=https://evil.test'),
          options,
        )
      ).status,
    ).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('validates a stop against its route', async () => {
    const result = await handleAPI(
      new Request('https://app.test/api/live/6884?stopId=102'),
      options,
    );
    expect(result.status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('returns a combined live response and shares upstream cache', async () => {
    const request = new Request('https://app.test/api/live/6884?stopId=101');
    const first = await handleAPI(request, options);
    expect(first.headers.get('cache-control')).toBe('no-store');
    const data = await first.json();
    expect(data.vehicles).toHaveLength(1);
    expect(data.arrivals).toHaveLength(1);
    expect(data.arrivalFetchedAt).toBeTruthy();
    await handleAPI(request, options);
    expect(fetcher).toHaveBeenCalledTimes(3);
    for (const [url] of fetcher.mock.calls)
      expect(url).toMatch(/^https:\/\/laxbus\.syncromatics\.com\/api\/rtpi\?/);
  });
  it('keeps the map response when arrivals fail', async () => {
    const original = fetcher.getMockImplementation();
    fetcher.mockImplementation((url) =>
      new URL(url).searchParams.get('path').includes('arrivals')
        ? Promise.resolve(new Response('unavailable', { status: 503 }))
        : original(url),
    );
    const data = await (
      await handleAPI(new Request('https://app.test/api/live/6884?stopId=101'), options)
    ).json();
    expect(data.vehicles).toHaveLength(1);
    expect(data.arrivalFetchedAt).toBeNull();
    expect(data.warnings).toContain('Arrival times unavailable.');
  });
  it('keeps predictions available when vehicle positions fail', async () => {
    const original = fetcher.getMockImplementation();
    fetcher.mockImplementation((url) =>
      new URL(url).searchParams.get('path').endsWith('vehicles')
        ? Promise.resolve(new Response('', { status: 503 }))
        : original(url),
    );
    const data = await (
      await handleAPI(new Request('https://app.test/api/live/6884?stopId=101'), options)
    ).json();
    expect(data.arrivals).toHaveLength(1);
    expect(data.vehicleFetchedAt).toBeNull();
  });
  it('keeps stops available when the route shape fails', async () => {
    const original = fetcher.getMockImplementation();
    fetcher.mockImplementation((url) =>
      new URL(url).searchParams.get('path').endsWith('patterns')
        ? Promise.resolve(Response.json({ error: 'bad response' }))
        : original(url),
    );
    const data = await (
      await handleAPI(new Request('https://app.test/api/routes/6884'), options)
    ).json();
    expect(data.stops).toHaveLength(1);
    expect(data.patterns).toEqual([]);
    expect(data.warning).toBeTruthy();
  });
});

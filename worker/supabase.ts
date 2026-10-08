import { FeedError } from './feed';
const ENDPOINT = 'https://yzdoarjleozzblvsjbhx.supabase.co/functions/v1/shuttle-feed';
const APP_KEY = 'sb_publishable_AkClR2bp72pGci-NAX1DBQ_8INzT0v1';
type Snapshot = Record<string, unknown>;
const inFlight = new Map<string, Promise<Snapshot>>();
export interface GatewayOptions {
  fetcher?: typeof fetch;
  cache?: Pick<Cache, 'match' | 'put'>;
}
export async function supabaseSnapshot(
  kind: string,
  routeID: number,
  stopID: number,
  {
    fetcher = globalThis.fetch,
    cache = (globalThis.caches as CacheStorage & { default?: Cache })?.default,
  }: GatewayOptions = {},
): Promise<Snapshot> {
  const path = `/api/${kind}/${routeID}${kind === 'live' ? `?stopId=${stopID}` : ''}`;
  const key = new Request(`https://laxcommute-cache.invalid/supabase${path}`);
  try {
    const hit = await cache?.match(key);
    if (hit && Number(hit.headers.get('X-Feed-Expires')) > Date.now())
      return (await hit.json()) as Snapshot;
  } catch {
    /* Cache failures do not hide data. */
  }
  const pending = inFlight.get(path);
  if (pending) return pending;
  const promise = (async () => {
    let response: Response;
    try {
      response = await fetcher(`${ENDPOINT}${path}`, {
        headers: { apikey: APP_KEY, Accept: 'application/json' },
        signal: AbortSignal.timeout(18_000),
      });
    } catch {
      throw new FeedError('The shuttle backend is taking too long. Please retry.');
    }
    let body: Snapshot;
    try {
      body = (await response.json()) as Snapshot;
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    } catch {
      throw new FeedError('The shuttle backend returned an unreadable response.');
    }
    if (!response.ok)
      throw new FeedError(
        response.status === 400 && typeof body.error === 'string'
          ? body.error
          : 'Shuttle data is temporarily unavailable.',
        response.status === 400 ? 400 : 502,
      );
    if (
      kind === 'routes'
        ? !Array.isArray(body.stops) || !Array.isArray(body.patterns)
        : !Array.isArray(body.vehicles) || !Array.isArray(body.arrivals)
    )
      throw new FeedError('The shuttle backend returned an unexpected response.');
    const times = [body.vehicleFetchedAt, body.arrivalFetchedAt]
      .filter((v): v is string => typeof v === 'string')
      .map(Date.parse);
    const expires = body.sourceUnavailable
      ? 0
      : kind === 'routes'
        ? Date.now() + 60_000
        : times.length
          ? Math.min(...times) + 15_000
          : 0;
    const ttl = Math.floor((expires - Date.now()) / 1000);
    if (cache && ttl > 0 && Number.isFinite(ttl)) {
      try {
        await cache.put(
          key,
          Response.json(body, {
            headers: {
              'Cache-Control': `public, max-age=${ttl}`,
              'X-Feed-Expires': String(expires),
            },
          }),
        );
      } catch {
        /* The result remains usable. */
      }
    }
    return body;
  })().finally(() => inFlight.delete(path));
  inFlight.set(path, promise);
  return promise;
}

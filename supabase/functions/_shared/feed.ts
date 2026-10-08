import type { Stop, Vehicle, RawArrival } from './types.ts';
export interface FeedOptions {
  cache?: Pick<Cache, 'match' | 'put'>;
  fetcher?: typeof fetch;
  origin?: string;
  claim?: (path: string) => Promise<boolean>;
}
type Envelope<T = unknown> = { data: T[]; fetchedAt: string; sourceUnavailable?: boolean };
const BASE = 'https://laxbus.syncromatics.com/api/rtpi';
export const ROUTE_IDS = new Set([6883, 6884, 6885]);
const inFlight = new Map<string, Promise<Envelope>>();
export class FeedError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
  }
}
const point = (x: Record<string, unknown>) =>
  typeof x.lat === 'number' &&
  Math.abs(x.lat) <= 90 &&
  typeof x.lon === 'number' &&
  Math.abs(x.lon) <= 180;
export function validFeed(path: string, data: unknown): data is unknown[] {
  if (!Array.isArray(data) || data.length > 5000) return false;
  return data.every((entry) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
    const x = entry as Record<string, unknown>;
    if (path.includes('/arrivals?')) {
      const pattern = x.pattern as { directionType?: unknown; direction?: unknown } | undefined;
      const vehicle = x.vehicle as
        { id?: unknown; name?: unknown; lastUpdated?: unknown } | undefined;
      if (
        pattern &&
        (typeof pattern !== 'object' ||
          (pattern.directionType !== undefined && typeof pattern.directionType !== 'string') ||
          (pattern.direction !== undefined && typeof pattern.direction !== 'string'))
      )
        return false;
      if (
        vehicle &&
        (typeof vehicle !== 'object' ||
          !Number.isSafeInteger(vehicle.id) ||
          (vehicle.name !== undefined && typeof vehicle.name !== 'string') ||
          (vehicle.lastUpdated !== undefined && typeof vehicle.lastUpdated !== 'string'))
      )
        return false;
      if (x.schedulePrediction !== undefined && typeof x.schedulePrediction !== 'boolean')
        return false;
      return (
        typeof x.secondsToArrival === 'number' &&
        Number.isFinite(x.secondsToArrival) &&
        x.secondsToArrival >= 0 &&
        x.secondsToArrival <= 86400 &&
        (!x.route ||
          (typeof x.route === 'object' && Number.isSafeInteger((x.route as { id?: number }).id)))
      );
    }
    if (!Number.isSafeInteger(x.id) || Number(x.id) < 0) return false;
    if (path.endsWith('/patterns')) return typeof x.shape === 'string' && x.shape.length <= 200000;
    if (!point(x)) return false;
    return path.endsWith('/stops')
      ? typeof x.name === 'string' && x.name.length <= 500
      : typeof x.lastUpdated === 'string' && Number.isFinite(Date.parse(x.lastUpdated));
  });
}
export async function cachedFeed<T = unknown>(
  path: string,
  ttl: number,
  {
    cache = (globalThis.caches as CacheStorage & { default?: Cache })?.default,
    fetcher = globalThis.fetch,
    origin = 'https://laxcommute-cache.invalid',
    claim,
  }: FeedOptions = {},
): Promise<Envelope<T>> {
  const key = new Request(`${origin}/feed/${encodeURIComponent(path)}`);
  const hit = await cache?.match(key);
  const saved = hit ? ((await hit.json()) as Envelope<T>) : undefined;
  const age = saved ? Date.now() - Date.parse(saved.fetchedAt) : Infinity;
  if (saved && age >= 0 && age < ttl * 1000 && validFeed(path, saved.data)) return saved;
  const stale =
    saved && age >= 0 && age < (ttl > 15 ? 86400000 : 300000) && validFeed(path, saved.data)
      ? { ...saved, sourceUnavailable: true }
      : undefined;
  const pendingKey = `${origin}:${path}`;
  const pending = inFlight.get(pendingKey);
  if (pending) return pending as Promise<Envelope<T>>;
  const promise = (async () => {
    try {
      if (claim && !(await claim(path))) {
        if (stale) return stale;
        // A different instance is refreshing this key. Wait for its result instead of hitting LAX.
        for (let n = 0; n < 10; n++) {
          await new Promise((resolve) => setTimeout(resolve, 400));
          const updated = await cache?.match(key);
          if (updated) {
            const body = (await updated.json()) as Envelope<T>;
            if (validFeed(path, body.data) && Date.now() - Date.parse(body.fetchedAt) < ttl * 1000)
              return body;
          }
        }
        throw new FeedError('The shuttle feed is refreshing. Please retry.', 503);
      }
      const url = new URL(BASE);
      url.searchParams.set('path', path);
      let lastError: unknown;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const fetchedAt = new Date().toISOString();
          const response = await fetcher(url.toString(), {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(3500),
          });
          if (!response.ok) throw new FeedError('The shuttle feed is temporarily unavailable.');
          const data: unknown = await response.json();
          if (!validFeed(path, data))
            throw new FeedError('The shuttle feed returned an unexpected response.');
          const envelope = { data: data as T[], fetchedAt };
          await cache?.put(
            key,
            Response.json(envelope, { headers: { 'Cache-Control': `public, max-age=${ttl}` } }),
          );
          return envelope;
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError;
    } catch (error) {
      if (stale) return stale;
      throw error instanceof FeedError
        ? error
        : new FeedError('The shuttle feed is taking too long. Please retry.');
    }
  })().finally(() => inFlight.delete(pendingKey));
  inFlight.set(pendingKey, promise);
  return promise;
}
export async function routeDetails(routeID: number, options?: FeedOptions) {
  const [stopResult, patternResult] = await Promise.allSettled([
    cachedFeed<Stop>(`routes/${routeID}/stops`, 3600, options),
    cachedFeed<{ id: number; shape: string }>(`routes/${routeID}/patterns`, 3600, options),
  ]);
  if (stopResult.status === 'rejected') throw stopResult.reason;
  const stops = stopResult.value;
  const patterns =
    patternResult.status === 'fulfilled'
      ? patternResult.value
      : { data: [], sourceUnavailable: true };
  const sourceUnavailable = Boolean(stops.sourceUnavailable || patterns.sourceUnavailable);
  return {
    stops: stops.data,
    patterns: patterns.data,
    fetchedAt: stops.fetchedAt,
    sourceUnavailable,
    warning: sourceUnavailable
      ? 'The route source is unavailable. Showing last known route data.'
      : null,
  };
}
export async function liveSnapshot(routeID: number, stopID: number, options?: FeedOptions) {
  if (stopID) {
    const stops = await cachedFeed<Stop>(`routes/${routeID}/stops`, 3600, options);
    if (!stops.data.some((s) => s.id === stopID))
      throw new FeedError('Choose a boarding stop on this route.', 400);
  }
  const results = await Promise.allSettled([
    cachedFeed<Vehicle>(`routes/${routeID}/vehicles`, 15, options),
    stopID
      ? cachedFeed<RawArrival>(`stops/${stopID}/arrivals?routeId=${routeID}`, 15, options)
      : Promise.resolve(null),
  ]);
  const vehicles = results[0].status === 'fulfilled' ? results[0].value : null;
  const arrivals = results[1].status === 'fulfilled' ? results[1].value : null;
  if (!vehicles && (!arrivals || !stopID))
    throw new FeedError('Live shuttle data is unavailable. Updates will retry automatically.');
  return {
    routeID,
    stopID,
    vehicles: vehicles?.data || [],
    vehicleFetchedAt: vehicles?.fetchedAt || null,
    arrivals: arrivals?.data || [],
    arrivalFetchedAt: arrivals?.fetchedAt || null,
    sourceUnavailable: Boolean(
      vehicles?.sourceUnavailable ||
      arrivals?.sourceUnavailable ||
      !vehicles ||
      (stopID && !arrivals),
    ),
    arrivalSourceUnavailable: Boolean(arrivals?.sourceUnavailable || (stopID && !arrivals)),
    vehicleSourceUnavailable: Boolean(vehicles?.sourceUnavailable || !vehicles),
    warnings: [
      (!vehicles || vehicles.sourceUnavailable) &&
        'Bus positions unavailable. Showing last known data if available.',
      stopID &&
        (!arrivals || arrivals.sourceUnavailable) &&
        'Arrival times unavailable. Showing last known data if available.',
    ].filter(Boolean),
  };
}

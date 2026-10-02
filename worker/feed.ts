import type { Stop, Vehicle, RawArrival } from '../src/types';
export interface FeedOptions {
  cache?: Pick<Cache, 'match' | 'put'>;
  fetcher?: typeof fetch;
  origin?: string;
}
type Envelope<T = unknown> = { data: T[]; fetchedAt: string };
const BASE = 'https://laxbus.syncromatics.com/api/rtpi';
export const ROUTE_IDS = new Set([6883, 6884, 6885]);
const inFlight = new Map<string, Promise<Envelope>>();

export class FeedError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

// Public data only. This is a fixed-path gateway, never an arbitrary URL proxy.
export async function cachedFeed<T = unknown>(
  path: string,
  ttl: number,
  {
    cache = (globalThis.caches as CacheStorage & { default?: Cache })?.default,
    fetcher = globalThis.fetch,
    origin = 'https://laxcommute-cache.invalid',
  }: FeedOptions = {},
): Promise<Envelope<T>> {
  const key = new Request(`${origin}/feed/${encodeURIComponent(path)}`);
  const hit = cache && (await cache.match(key));
  if (hit) {
    const envelope = (await hit.json()) as Envelope<T>;
    // Keep an explicit freshness check, including when local cache emulation retains expired entries.
    if (Date.now() - Date.parse(envelope.fetchedAt) < ttl * 1_000) return envelope;
  }
  const pendingKey = `${origin}:${path}`;
  const pending = inFlight.get(pendingKey);
  if (pending) return pending as Promise<Envelope<T>>;
  const promise = (async () => {
    const url = new URL(BASE);
    url.searchParams.set('path', path);
    const fetchedAt = new Date().toISOString();
    let response;
    try {
      response = await fetcher(url.toString(), {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(8_000),
      });
    } catch {
      throw new FeedError('The shuttle feed is taking too long. Please retry.');
    }
    if (!response.ok) throw new FeedError('The shuttle feed is temporarily unavailable.');
    let data;
    try {
      data = await response.json();
    } catch {
      throw new FeedError('The shuttle feed returned an unreadable response.');
    }
    if (!Array.isArray(data))
      throw new FeedError('The shuttle feed returned an unexpected response.');
    const envelope: Envelope<T> = { data, fetchedAt };
    if (cache)
      await cache.put(
        key,
        Response.json(envelope, { headers: { 'Cache-Control': `public, max-age=${ttl}` } }),
      );
    return envelope;
  })().finally(() => inFlight.delete(pendingKey));
  inFlight.set(pendingKey, promise);
  return promise;
}

export async function routeDetails(routeID: number, options?: FeedOptions) {
  const stops = await cachedFeed<Stop>(`routes/${routeID}/stops`, 3_600, options);
  let patterns: { data: { id: number; shape: string }[] } = { data: [] },
    warning = null;
  try {
    patterns = await cachedFeed<{ id: number; shape: string }>(
      `routes/${routeID}/patterns`,
      3_600,
      options,
    );
  } catch {
    warning = 'The route line is unavailable. Stops and buses can still update.';
  }
  return { stops: stops.data, patterns: patterns.data, warning };
}

export async function liveSnapshot(routeID: number, stopID: number, options?: FeedOptions) {
  // Membership prevents arbitrary stop probing and mistakes after switching routes.
  if (stopID) {
    const stops = await cachedFeed<Stop>(`routes/${routeID}/stops`, 3_600, options);
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
    warnings: [
      !vehicles && 'Bus positions unavailable.',
      stopID && !arrivals && 'Arrival times unavailable.',
    ].filter(Boolean),
  };
}

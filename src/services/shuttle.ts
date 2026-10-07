import type { Stop, LiveData } from '../types';
import { decodePolyline } from '../domain/commute';
import { normalizeArrivals } from '../domain/arrivals';

export const SHUTTLE_REQUEST_TIMEOUT_MS = 20_000;
async function get(path: string, signal?: AbortSignal) {
  const controller = new AbortController();
  const cancel = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', cancel, { once: true });
  if (signal?.aborted) cancel();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, SHUTTLE_REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(path, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      let body;
      try {
        body = await response.json();
      } catch {
        /* Use the fallback message. */
      }
      throw new Error(body?.error || 'Shuttle data is unavailable. Please retry.');
    }
    // Await the body here so the deadline also covers a stalled response body.
    const data = await response.json();
    return { ...data, cached: response.headers.get('X-LAXCommute-Cached') === '1' };
  } catch (error) {
    if (timedOut && !signal?.aborted)
      throw new Error('The shuttle request timed out. Please retry.');
    throw error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}
export async function getRoute(routeID: number, signal?: AbortSignal) {
  const data: {
    stops: Stop[];
    patterns: { id: number; shape: string }[];
    warning: string | null;
    cached?: boolean;
  } = await get(`/api/routes/${routeID}`, signal);
  return {
    stops: data.stops.filter(
      (s: Stop) =>
        Number.isSafeInteger(s.id) &&
        typeof s.name === 'string' &&
        Number.isFinite(s.lat) &&
        Number.isFinite(s.lon),
    ),
    paths: data.patterns
      .map((p: { id: number; shape: string }) => ({
        id: p.id,
        coordinates: decodePolyline(p.shape),
      }))
      .filter((p: { coordinates: unknown[] }) => p.coordinates.length > 1),
    warning: data.warning,
    cached: data.cached,
  };
}
export async function getLive(routeID: number, stopID?: number, signal?: AbortSignal) {
  const data: LiveData = await get(`/api/live/${routeID}?stopId=${stopID || 0}`, signal);
  return { ...data, predictions: normalizeArrivals(data.arrivals, routeID, data.arrivalFetchedAt) };
}

import type { Stop, LiveData } from '../types';
import { decodePolyline } from '../domain/commute';
import { normalizeArrivals } from '../domain/arrivals';

async function get(path: string, signal?: AbortSignal) {
  const response = await fetch(path, {
    signal,
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    let body;
    try {
      body = await response.json();
    } catch {
      /* Keep the useful fallback. */
    }
    throw new Error(body?.error || 'Shuttle data is unavailable. Please retry.');
  }
  return response.json();
}
export async function getRoute(routeID: number, signal?: AbortSignal) {
  const data: { stops: Stop[]; patterns: { id: number; shape: string }[]; warning: string | null } =
    await get(`/api/routes/${routeID}`, signal);
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
  };
}
export async function getLive(routeID: number, stopID?: number, signal?: AbortSignal) {
  const data: LiveData = await get(`/api/live/${routeID}?stopId=${stopID || 0}`, signal);
  return { ...data, predictions: normalizeArrivals(data.arrivals, routeID, data.arrivalFetchedAt) };
}

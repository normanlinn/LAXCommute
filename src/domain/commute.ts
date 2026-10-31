import type { Point, Stop, Commute, Direction, Route } from '../types';
export const ROUTES = Object.freeze<Route[]>([
  { id: 6885, lot: 'South', color: '#007981', short: 'S', coverage: 'All terminals' },
  { id: 6884, lot: 'East', color: '#3262ab', short: 'E', coverage: 'Terminals 1–3 + B' },
  { id: 6883, lot: 'West', color: '#b76328', short: 'W', coverage: 'Terminals 4–7' },
]);
export const TERMINALS = [
  'Terminal 1',
  'Terminal 2',
  'Terminal 3',
  'Terminal B (TBIT)',
  'Terminal 4',
  'Terminal 5',
  'Terminal 6',
  'Terminal 7',
  'Terminal 8',
];
export const DEFAULT_COMMUTE: Readonly<Commute> = Object.freeze({
  lot: 'South',
  terminal: 'Terminal B (TBIT)',
  terminalStopID: 0,
  terminalStopName: '',
  parkingStopID: 0,
  parkingStopName: '',
  walkingMinutes: 7,
  bufferMinutes: 2,
});

export function routeForLot(lot: string) {
  return ROUTES.find((r) => r.lot === lot) || ROUTES[0];
}
export function terminalKey(value = '') {
  if (/\b(TBIT|Terminal\s*B)\b/i.test(value)) return 'B';
  return value.match(/(?:Terminal\s*|^T)([1-8])\b/i)?.[1] || '';
}
export function isTerminalStop(stop: Stop) {
  return Boolean(terminalKey(stop.name));
}
export function boardingStops(stops: Stop[], direction: Direction, lot: string) {
  if (direction === 'parking') return stops.filter(isTerminalStop);
  return stops
    .filter(
      (s) =>
        !isTerminalStop(s) &&
        (s.name.toLowerCase().includes(lot.toLowerCase()) ||
          (lot !== 'South' && /\bsouth\s+lot\b/i.test(s.name))) &&
        !/drop[ -]?off|layover/i.test(s.name),
    )
    .sort(
      (a, b) =>
        Number(!a.name.toLowerCase().includes(lot.toLowerCase())) -
        Number(!b.name.toLowerCase().includes(lot.toLowerCase())),
    );
}
export function savedBoardingStop(
  profile: Commute,
  stops: Stop[],
  direction: Direction,
  lot: string,
) {
  const options = boardingStops(stops, direction, lot);
  const id = direction === 'parking' ? profile.terminalStopID : profile.parkingStopID;
  const exact = options.find((s) => s.id === id);
  if (exact && profile.lot === lot) return exact;
  if (direction === 'parking')
    return options.find((s) => terminalKey(s.name) === terminalKey(profile.terminal));
  return options[0];
}
export function normalizeCommute(value: unknown): Commute {
  const source = (value && typeof value === 'object' ? value : {}) as Partial<Commute>;
  return {
    lot: ROUTES.some((r) => r.lot === source.lot) ? source.lot! : DEFAULT_COMMUTE.lot,
    terminal: TERMINALS.includes(source.terminal || '')
      ? source.terminal!
      : DEFAULT_COMMUTE.terminal,
    terminalStopID: Number.isSafeInteger(source.terminalStopID) ? source.terminalStopID! : 0,
    terminalStopName: typeof source.terminalStopName === 'string' ? source.terminalStopName : '',
    parkingStopID: Number.isSafeInteger(source.parkingStopID) ? source.parkingStopID! : 0,
    parkingStopName: typeof source.parkingStopName === 'string' ? source.parkingStopName : '',
    walkingMinutes: Math.min(45, Math.max(1, Number(source.walkingMinutes) || 7)),
    bufferMinutes: Math.min(
      10,
      Math.max(0, Number.isFinite(source.bufferMinutes) ? source.bufferMinutes! : 2),
    ),
  };
}
export function distanceMeters(a: Point, b: Point) {
  const radians = Math.PI / 180;
  const dLat = (b.lat - a.lat) * radians;
  const dLon = (b.lon - a.lon) * radians;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(dLon / 2) ** 2;
  return 6_371_000 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
// Straight-line distance understates real paths around terminals and lots.
const WALK_DETOUR = 1.3;
const WALK_METERS_PER_MIN = 80;
export const LOCATION_TTL_MS = 10 * 60_000;
/**
 * Rough walk time from a recent GPS fix to a stop, or null when the fix is old,
 * imprecise, far away, or already at the stop (no walk worth advising).
 */
export function walkingMinutesFrom(
  location: (Point & { accuracy?: number; at?: number }) | null | undefined,
  stop: Point | undefined,
  now = Date.now(),
) {
  if (!location || !stop) return null;
  if (!Number.isFinite(location.at) || now - location.at! > LOCATION_TTL_MS) return null;
  if ((location.accuracy ?? 0) > 150) return null;
  const meters = distanceMeters(location, stop);
  if (!Number.isFinite(meters) || meters < 60 || meters > 2_000) return null;
  return Math.max(1, Math.ceil((meters * WALK_DETOUR) / WALK_METERS_PER_MIN));
}
export function nearestStop(stops: Stop[], location: Point) {
  return stops.reduce<Stop | null>(
    (best, stop) =>
      !best || distanceMeters(location, stop) < distanceMeters(location, best) ? stop : best,
    null,
  );
}
export function mapsLink(stop?: Stop) {
  return stop
    ? `https://maps.apple.com/?q=${encodeURIComponent(stop.name)}&ll=${stop.lat},${stop.lon}`
    : 'https://maps.apple.com/?q=Los+Angeles+International+Airport';
}
export function directionsLinks(stop: Stop) {
  const destination = `${stop.lat},${stop.lon}`;
  return [
    {
      label: 'Apple Maps',
      href: `https://maps.apple.com/?${new URLSearchParams({ daddr: destination, dirflg: 'w' })}`,
    },
    {
      label: 'Google Maps',
      href: `https://www.google.com/maps/dir/?${new URLSearchParams({ api: '1', destination, travelmode: 'walking' })}`,
    },
  ];
}
export function decodePolyline(encoded: unknown): Point[] {
  if (typeof encoded !== 'string') return [];
  const points = [];
  let cursor = 0,
    lat = 0,
    lon = 0;
  const read = () => {
    let shift = 0,
      value = 0,
      byte;
    do {
      if (cursor >= encoded.length || shift > 30) throw new Error('Invalid route shape');
      byte = encoded.charCodeAt(cursor++) - 63;
      if (byte < 0 || byte > 63) throw new Error('Invalid route shape');
      value |= (byte & 31) << shift;
      shift += 5;
    } while (byte >= 32);
    return value & 1 ? ~(value >> 1) : value >> 1;
  };
  try {
    while (cursor < encoded.length) {
      lat += read();
      lon += read();
      const point = { lat: lat / 100_000, lon: lon / 100_000 };
      if (Math.abs(point.lat) > 90 || Math.abs(point.lon) > 180) return [];
      points.push(point);
    }
  } catch {
    return [];
  }
  return points;
}

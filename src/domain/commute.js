export const ROUTES = Object.freeze([
  { id: 6885, lot: 'South', color: '#087969', short: 'S', coverage: 'All terminals' },
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
export const DEFAULT_COMMUTE = Object.freeze({
  lot: 'South',
  terminal: 'Terminal B (TBIT)',
  terminalStopID: 0,
  terminalStopName: '',
  parkingStopID: 0,
  parkingStopName: '',
  walkingMinutes: 7,
  bufferMinutes: 2,
});

export function routeForLot(lot) {
  return ROUTES.find((r) => r.lot === lot) || ROUTES[0];
}
export function terminalKey(value = '') {
  if (/\b(TBIT|Terminal\s*B)\b/i.test(value)) return 'B';
  return value.match(/(?:Terminal\s*|^T)([1-8])\b/i)?.[1] || '';
}
export function isTerminalStop(stop) {
  return Boolean(terminalKey(stop.name));
}
export function boardingStops(stops, direction, lot) {
  if (direction === 'parking') return stops.filter(isTerminalStop);
  return stops.filter(
    (s) =>
      !isTerminalStop(s) &&
      s.name.toLowerCase().includes(lot.toLowerCase()) &&
      !/drop off|layover/i.test(s.name),
  );
}
export function savedBoardingStop(profile, stops, direction, lot) {
  const options = boardingStops(stops, direction, lot);
  const id = direction === 'parking' ? profile.terminalStopID : profile.parkingStopID;
  const exact = options.find((s) => s.id === id);
  if (exact) return exact;
  if (direction === 'parking')
    return options.find((s) => terminalKey(s.name) === terminalKey(profile.terminal));
  return options[0];
}
export function normalizeCommute(value) {
  const source = value && typeof value === 'object' ? value : {};
  return {
    lot: ROUTES.some((r) => r.lot === source.lot) ? source.lot : DEFAULT_COMMUTE.lot,
    terminal: TERMINALS.includes(source.terminal) ? source.terminal : DEFAULT_COMMUTE.terminal,
    terminalStopID: Number.isSafeInteger(source.terminalStopID) ? source.terminalStopID : 0,
    terminalStopName: typeof source.terminalStopName === 'string' ? source.terminalStopName : '',
    parkingStopID: Number.isSafeInteger(source.parkingStopID) ? source.parkingStopID : 0,
    parkingStopName: typeof source.parkingStopName === 'string' ? source.parkingStopName : '',
    walkingMinutes: Math.min(45, Math.max(1, Number(source.walkingMinutes) || 7)),
    bufferMinutes: Math.min(
      10,
      Math.max(0, Number.isFinite(source.bufferMinutes) ? source.bufferMinutes : 2),
    ),
  };
}
export function distanceMeters(a, b) {
  const radians = Math.PI / 180;
  const dLat = (b.lat - a.lat) * radians;
  const dLon = (b.lon - a.lon) * radians;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * radians) * Math.cos(b.lat * radians) * Math.sin(dLon / 2) ** 2;
  return 6_371_000 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function nearestStop(stops, location) {
  return stops.reduce(
    (best, stop) =>
      !best || distanceMeters(location, stop) < distanceMeters(location, best) ? stop : best,
    null,
  );
}
export function mapsLink(stop) {
  return stop
    ? `https://maps.apple.com/?q=${encodeURIComponent(stop.name)}&ll=${stop.lat},${stop.lon}`
    : 'https://maps.apple.com/?q=Los+Angeles+International+Airport';
}
export function decodePolyline(encoded) {
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

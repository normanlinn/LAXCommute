// Made-up buses for showing how the app works. Three buses drive the route's saved path
// once every LOOP_MS, evenly spaced; arrival times come from those same positions, so
// the map, the departure card and the list always agree. Never mixed with real data.
import type { LiveData, Point, Prediction, RoutePath, Stop, Vehicle } from '../types';

const LOOP_MS = 24 * 60_000;
const BUSES = 3;
// Far outside the tracker's id range, so a sample bus can never match a real one.
const SAMPLE_ID_BASE = 990_000_000;

const toRad = (deg: number) => (deg * Math.PI) / 180;
// Short distances around LAX: a flat projection is accurate enough.
function meters(a: Point, b: Point) {
  const x = toRad(b.lon - a.lon) * Math.cos(toRad((a.lat + b.lat) / 2));
  const y = toRad(b.lat - a.lat);
  return Math.hypot(x, y) * 6_371_000;
}
function bearing(a: Point, b: Point) {
  const x = toRad(b.lon - a.lon) * Math.cos(toRad((a.lat + b.lat) / 2));
  const y = toRad(b.lat - a.lat);
  return ((Math.atan2(x, y) * 180) / Math.PI + 360) % 360;
}

/** The longest saved path is the full loop. */
function loopOf(paths: RoutePath[]) {
  const coordinates = paths.reduce<Point[]>(
    (longest, p) => (p.coordinates.length > longest.length ? p.coordinates : longest),
    [],
  );
  const distances = [0];
  for (let i = 1; i < coordinates.length; i++)
    distances.push(distances[i - 1] + meters(coordinates[i - 1], coordinates[i]));
  return { coordinates, distances, total: distances.at(-1) || 0 };
}

function pointAt(loop: ReturnType<typeof loopOf>, distance: number) {
  const { coordinates, distances } = loop;
  let i = distances.findIndex((d) => d >= distance);
  if (i <= 0) i = 1;
  const a = coordinates[i - 1];
  const b = coordinates[i];
  const span = distances[i] - distances[i - 1] || 1;
  const share = Math.min(1, Math.max(0, (distance - distances[i - 1]) / span));
  return {
    lat: a.lat + (b.lat - a.lat) * share,
    lon: a.lon + (b.lon - a.lon) * share,
    headingDegrees: bearing(a, b),
  };
}

/** Distance along the loop of the path point closest to the stop. */
function distanceOf(loop: ReturnType<typeof loopOf>, stop: Point) {
  let best = 0;
  let bestGap = Infinity;
  loop.coordinates.forEach((p, i) => {
    const gap = meters(p, stop);
    if (gap < bestGap) {
      bestGap = gap;
      best = loop.distances[i];
    }
  });
  return best;
}

export function sampleLive(
  routeID: number,
  stop: Stop | undefined,
  paths: RoutePath[],
  now = Date.now(),
): LiveData {
  const at = new Date(now).toISOString();
  const loop = loopOf(paths);
  const empty: LiveData = {
    routeID,
    stopID: stop?.id || 0,
    vehicles: [],
    vehicleFetchedAt: at,
    arrivals: [],
    arrivalFetchedAt: at,
    warnings: [],
    predictions: [],
  };
  if (loop.total === 0) return empty;
  const stopAt = stop ? distanceOf(loop, stop) : null;
  const vehicles: Vehicle[] = [];
  const predictions: Prediction[] = [];
  for (let n = 0; n < BUSES; n++) {
    const progress = (now / LOOP_MS + n / BUSES) % 1;
    const distance = progress * loop.total;
    const id = SAMPLE_ID_BASE + routeID * 10 + n;
    const name = `Demo ${n + 1}`;
    vehicles.push({ id, name, lastUpdated: at, speed: 8, ...pointAt(loop, distance) });
    if (stopAt !== null) {
      const ahead = ((((stopAt - distance) / loop.total) % 1) + 1) % 1;
      predictions.push({
        id: `sample-${routeID}-${n}`,
        due: now + ahead * LOOP_MS,
        scheduled: false,
        vehicleID: id,
        busName: name,
        vehicleUpdated: now,
      });
    }
  }
  predictions.sort((a, b) => a.due - b.due);
  return { ...empty, vehicles, predictions };
}

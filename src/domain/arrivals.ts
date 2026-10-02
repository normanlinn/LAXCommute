import type { RawArrival, Vehicle, Prediction } from '../types';
export const ARRIVAL_TTL_MS = 90_000;
export const GPS_TTL_MS = 180_000;

export function normalizeArrivals(values: RawArrival[], routeID: number, fetchedAt: string | null) {
  const fetched = Date.parse(fetchedAt || '');
  if (!Array.isArray(values) || !Number.isFinite(fetched)) return [];
  return values
    .flatMap((value) => {
      const seconds = value.secondsToArrival;
      const loop =
        (value.pattern?.directionType || value.pattern?.direction || '').trim().toLowerCase() ===
        'loop';
      if (
        value.route?.id !== routeID ||
        !loop ||
        typeof seconds !== 'number' ||
        !Number.isFinite(seconds) ||
        seconds < 0
      )
        return [];
      return [
        {
          id: `${routeID}:${value.vehicle?.id || 'schedule'}:${fetched + seconds * 1_000}`,
          due: fetched + seconds * 1_000,
          scheduled: value.schedulePrediction === true || !value.vehicle,
          vehicleID: value.vehicle?.id,
          busName: value.vehicle?.name || '',
          vehicleUpdated: Date.parse(value.vehicle?.lastUpdated || ''),
        },
      ];
    })
    .sort((a, b) => a.due - b.due);
}
export function snapshotFresh(fetchedAt: string | null | undefined, now = Date.now()) {
  const stamp = Date.parse(fetchedAt || '');
  return Number.isFinite(stamp) && now - stamp < ARRIVAL_TTL_MS && now - stamp >= -30_000;
}
export function validVehicle(vehicle: Partial<Vehicle>, now = Date.now()) {
  const time = Date.parse(vehicle.lastUpdated || '');
  return (
    typeof vehicle.lat === 'number' &&
    typeof vehicle.lon === 'number' &&
    Math.abs(vehicle.lat) <= 90 &&
    Math.abs(vehicle.lon) <= 180 &&
    Number.isFinite(time) &&
    now - time < GPS_TTL_MS &&
    now - time >= -30_000
  );
}
export function availableArrivals(arrivals: Prediction[], now: number) {
  return arrivals.filter(
    (a) =>
      a.due > now &&
      (a.scheduled ||
        !Number.isFinite(a.vehicleUpdated) ||
        (now - a.vehicleUpdated < GPS_TTL_MS && now - a.vehicleUpdated >= -30_000)),
  );
}
export function departureAdvice(
  arrivals: Prediction[],
  walkingMinutes: number,
  bufferMinutes: number,
  now = Date.now(),
) {
  const walking = walkingMinutes * 60_000;
  const next = availableArrivals(arrivals, now).find(
    (a) =>
      !a.scheduled &&
      Number.isFinite(a.vehicleUpdated) &&
      now - a.vehicleUpdated < GPS_TTL_MS &&
      a.due - now >= walking,
  );
  if (!next) return null;
  return {
    arrival: next,
    leaveAt: next.due - walking - bufferMinutes * 60_000,
    walkingMinutes,
    bufferMinutes,
  };
}

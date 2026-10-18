import type { RawArrival, Vehicle, Prediction, Stop } from '../types';
import { distanceMeters } from './commute';
export const ARRIVAL_TTL_MS = 90_000;
export const GPS_TTL_MS = 180_000;
// Keep an upstream zero-second prediction visible briefly as 'Arriving'.
export const ARRIVING_GRACE_MS = 45_000;
// GPS at the stop is useful context, but cannot prove the shuttle is boarding.
export const NEAR_STOP_METERS = 75;
export const NEAR_STOP_GPS_AGE_MS = 45_000;

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
      (a.due > now || (!a.scheduled && a.due >= now - ARRIVING_GRACE_MS)) &&
      (a.scheduled ||
        !Number.isFinite(a.vehicleUpdated) ||
        (now - a.vehicleUpdated < GPS_TTL_MS && now - a.vehicleUpdated >= -30_000)),
  );
}

/**
 * A reported bus at a stop may be completing a different pass of its loop.
 * This is separate from the feed's predicted arrival time. The UI must never
 * claim boarding is confirmed based on GPS proximity alone.
 */
export function nextLoopBusesAtStop(
  vehicles: Vehicle[],
  stop: Stop | undefined,
  predictions: Prediction[],
  now = Date.now(),
) {
  if (!stop || !Number.isFinite(stop.lat) || !Number.isFinite(stop.lon)) return [];
  return vehicles.flatMap((bus) => {
    const updated = Date.parse(bus.lastUpdated || '');
    if (
      !Number.isSafeInteger(bus.id) ||
      !validVehicle(bus, now) ||
      now - updated > NEAR_STOP_GPS_AGE_MS ||
      distanceMeters(stop, bus) > NEAR_STOP_METERS
    )
      return [];
    // Match immutable vehicle IDs, not visible fleet numbers, which can change.
    const nextPrediction = predictions.find(
      (arrival) =>
        !arrival.scheduled &&
        arrival.vehicleID === bus.id &&
        arrival.due > now + 3 * 60_000,
    );
    return nextPrediction ? [{ vehicle: bus, nextPrediction }] : [];
  });
}

import { describe, expect, it } from 'vitest';
import {
  availableArrivals,
  departureAdvice,
  normalizeArrivals,
  nextLoopBusesAtStop,
  snapshotFresh,
  validVehicle,
} from '../src/domain/arrivals';

const at = '2026-09-30T06:00:00.000Z';
const now = Date.parse(at);
const arrival = (changes = {}) => ({
  route: { id: 6884 },
  pattern: { direction: 'East Lot', directionType: 'Loop' },
  secondsToArrival: 600,
  vehicle: { id: 1, name: '12', lastUpdated: at },
  schedulePrediction: false,
  ...changes,
});
describe('arrival rules', () => {
  it('accepts the real Loop directionType with a lot name as direction', () => {
    expect(normalizeArrivals([arrival()], 6884, at)[0].due).toBe(now + 600_000);
  });
  it('anchors cached estimates to the upstream fetch time', () => {
    const result = normalizeArrivals([arrival()], 6884, at);
    expect(result[0].due - (now + 15_000)).toBe(585_000);
  });
  it('rejects other routes, invalid numbers, and non-loop patterns', () => {
    const data = [
      arrival({ route: { id: 6883 } }),
      arrival({ secondsToArrival: -1 }),
      arrival({ secondsToArrival: NaN }),
      arrival({ secondsToArrival: '10' }),
      arrival({ pattern: { directionType: 'Outbound' } }),
    ];
    expect(normalizeArrivals(data, 6884, at)).toEqual([]);
  });
  it('supports the old loop field only when directionType is absent', () => {
    expect(normalizeArrivals([arrival({ pattern: { direction: 'Loop' } })], 6884, at)).toHaveLength(
      1,
    );
  });
  it('labels schedules separately and excludes passed or stale GPS arrivals', () => {
    const result = normalizeArrivals(
      [
        arrival({ schedulePrediction: true }),
        arrival({ vehicle: { id: 2, lastUpdated: '2026-09-30T05:50:00Z' } }),
        arrival({ secondsToArrival: 0 }),
      ],
      6884,
      at,
    );
    expect(availableArrivals(result, now)).toHaveLength(2);
    expect(availableArrivals(result, now + 46_000)).toHaveLength(1);
    expect(availableArrivals(result, now + 46_000)[0].scheduled).toBe(true);
  });
  it('expires snapshots and validates fresh GPS coordinates', () => {
    expect(snapshotFresh(at, now + 89_999)).toBe(true);
    expect(snapshotFresh(at, now + 90_000)).toBe(false);
    expect(snapshotFresh('bad', now)).toBe(false);
    expect(validVehicle({ lat: 33.94, lon: -118.4, lastUpdated: at }, now)).toBe(true);
    expect(validVehicle({ lat: 333, lon: -118.4, lastUpdated: at }, now)).toBe(false);
    expect(validVehicle({ lat: 33.94, lon: -118.4, lastUpdated: at }, now + 180_000)).toBe(false);
  });
  it('uses the first catchable live bus and includes walking and buffer time', () => {
    const result = normalizeArrivals(
      [
        arrival({ secondsToArrival: 120 }),
        arrival({ secondsToArrival: 600 }),
        arrival({ secondsToArrival: 480, schedulePrediction: true }),
      ],
      6884,
      at,
    );
    const advice = departureAdvice(result, 7, 2, now);
    expect(advice.arrival.due).toBe(now + 600_000);
    expect(advice.leaveAt).toBe(now + 60_000);
    expect(departureAdvice(result, 20, 2, now)).toBeNull();
  });
  it.each([
    ['South', 6885],
    ['East', 6884],
    ['West', 6883],
  ])('keeps a zero-second %s arrival briefly, then expires it', (_lot, routeId) => {
    const immediately = normalizeArrivals(
      [arrival({ route: { id: routeId }, secondsToArrival: 0 })],
      routeId,
      at,
    );
    expect(availableArrivals(immediately, now)).toHaveLength(1);
    expect(availableArrivals(immediately, now + 44_999)).toHaveLength(1);
    expect(availableArrivals(immediately, now + 45_001)).toHaveLength(0);
    const scheduled = normalizeArrivals(
      [arrival({ route: { id: routeId }, secondsToArrival: 0, schedulePrediction: true })],
      routeId,
      at,
    );
    expect(availableArrivals(scheduled, now)).toHaveLength(0);
  });
  it.each([
    ['South', 6885],
    ['East', 6884],
    ['West', 6883],
  ])('distinguishes GPS at %s boarding from a next-loop ETA', (_lot, routeId) => {
    const stop = { id: 11319089, name: 'South Lot Stop #1', lat: 33.95313, lon: -118.393406 };
    const bus = {
      id: 11150,
      name: '8022',
      lat: 33.95313,
      lon: -118.393406,
      lastUpdated: at,
    };
    const prediction = normalizeArrivals(
      [
        arrival({
          route: { id: routeId },
          vehicle: { id: 11150, name: '8022', lastUpdated: at },
          secondsToArrival: 1560,
        }),
      ],
      routeId,
      at,
    );
    const onSite = nextLoopBusesAtStop([bus], stop, prediction, now);
    expect(onSite).toHaveLength(1);
    expect(onSite[0].vehicle.name).toBe('8022');
    expect(onSite[0].nextPrediction.due - now).toBe(26 * 60_000);
    expect(nextLoopBusesAtStop([bus], stop, prediction, now + 46_000)).toEqual([]);
    expect(nextLoopBusesAtStop([{ ...bus, lat: 33.94 }], stop, prediction, now)).toEqual([]);
    expect(nextLoopBusesAtStop([bus], stop, [], now)).toEqual([]);
  });
  it('does not treat a different bus or scheduled prediction as a boarding confirmation', () => {
    const stop = { id: 11319089, name: 'South Lot Stop #1', lat: 33.95313, lon: -118.393406 };
    const vehicles = [{ id: 11150, name: '8022', lat: stop.lat, lon: stop.lon, lastUpdated: at }];
    for (const options of [
      { vehicle: { id: 77777, name: '8022', lastUpdated: at } },
      { schedulePrediction: true },
    ]) {
      const prediction = normalizeArrivals(
        [arrival({ ...options, secondsToArrival: 1560 })],
        6884,
        at,
      );
      expect(nextLoopBusesAtStop(vehicles, stop, prediction, now)).toEqual([]);
    }
  });
  it('rejects future GPS timestamps when choosing a live departure', () => {
    const future = new Date(now + 60_000).toISOString();
    const result = normalizeArrivals(
      [arrival({ vehicle: { id: 1, lastUpdated: future } })],
      6884,
      at,
    );
    expect(availableArrivals(result, now)).toEqual([]);
    expect(departureAdvice(result, 7, 2, now)).toBeNull();
  });
});

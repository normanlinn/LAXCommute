import { describe, expect, it } from 'vitest';
import { sampleLive } from '../src/domain/sample';
import { getFallbackRoute } from '../src/services/shuttle';
import { availableArrivals, validVehicle } from '../src/domain/arrivals';

const route = getFallbackRoute(6885);
const stop = route.stops.find((s) => s.name === 'South Lot Stop #1');
const now = Date.parse('2026-11-17T12:00:00Z');

describe('sample buses', () => {
  it('puts three made-up buses on the route with ids no real bus uses', () => {
    const data = sampleLive(6885, stop, route.paths, now);
    expect(data.vehicles).toHaveLength(3);
    expect(data.vehicles.every((v) => validVehicle(v, now))).toBe(true);
    expect(data.vehicles.every((v) => v.id >= 990_000_000 && v.name.startsWith('Demo'))).toBe(true);
  });

  it('gives upcoming arrivals at the stop, evenly spaced and in order', () => {
    const { predictions } = sampleLive(6885, stop, route.paths, now);
    expect(availableArrivals(predictions, now)).toHaveLength(3);
    const gaps = predictions.slice(1).map((p, i) => p.due - predictions[i].due);
    expect(gaps.every((g) => Math.abs(g - 8 * 60_000) < 1_000)).toBe(true);
  });

  it('moves the buses as time passes', () => {
    const first = sampleLive(6885, stop, route.paths, now).vehicles[0];
    const later = sampleLive(6885, stop, route.paths, now + 60_000).vehicles[0];
    expect([later.lat, later.lon]).not.toEqual([first.lat, first.lon]);
  });

  it('shows no buses when there is no route path', () => {
    expect(sampleLive(6885, stop, [], now).vehicles).toEqual([]);
  });
});

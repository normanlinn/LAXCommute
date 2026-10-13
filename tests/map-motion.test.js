import { describe, expect, it } from 'vitest';
import { routeMotionPath, positionOnMotionPath } from '../src/domain/map-motion';

const road = [
  { lat: 33.94, lon: -118.4 },
  { lat: 33.941, lon: -118.4 },
  { lat: 33.941, lon: -118.399 },
];
describe('honest shuttle marker animation', () => {
  it('follows the actual street bend between reported GPS points', () => {
    const path = routeMotionPath(road[0], road[2], [{ id: 1, coordinates: road }]);
    expect(path).not.toBeNull();
    const mid = positionOnMotionPath(path, 0.5);
    expect(mid.lon).toBeCloseTo(-118.4, 3);
    expect(mid.lat).toBeGreaterThan(33.9405);
    expect(positionOnMotionPath(path, 1)).toEqual(road[2]);
  });
  it('does not animate jumps where route geometry is missing', () => {
    expect(routeMotionPath(road[0], road[2], [])).toBeNull();
    expect(
      routeMotionPath(road[0], { lat: 33.98, lon: -118.38 }, [{ id: 1, coordinates: road }]),
    ).toBeNull();
  });
  it('rejects distant GPS fixes away from a mapped street', () => {
    expect(
      routeMotionPath({ lat: 33.943, lon: -118.4 }, road[2], [{ id: 1, coordinates: road }]),
    ).toBeNull();
  });
  it('supports travel in the reverse direction', () => {
    const path = routeMotionPath(road[2], road[0], [{ id: 1, coordinates: road }]);
    expect(path).not.toBeNull();
    expect(positionOnMotionPath(path, 1)).toEqual(road[0]);
  });
});

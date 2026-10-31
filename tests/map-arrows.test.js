import { describe, expect, it } from 'vitest';
import { bearingDegrees, routeArrows, segmentMeters } from '../src/domain/map-motion';

describe('route direction arrows', () => {
  it('measures compass bearings clockwise from north', () => {
    const origin = { lat: 33.95, lon: -118.4 };
    expect(bearingDegrees(origin, { lat: 33.96, lon: -118.4 })).toBeCloseTo(0);
    expect(bearingDegrees(origin, { lat: 33.95, lon: -118.39 })).toBeCloseTo(90);
    expect(bearingDegrees(origin, { lat: 33.94, lon: -118.4 })).toBeCloseTo(180);
    expect(bearingDegrees(origin, { lat: 33.95, lon: -118.41 })).toBeCloseTo(270);
  });

  it('spaces arrows evenly and points them along the shape order', () => {
    const shape = [
      { lat: 33.95, lon: -118.4 },
      { lat: 33.95, lon: -118.39 },
      { lat: 33.96, lon: -118.39 },
    ];
    const arrows = routeArrows(shape, 200);
    const total = segmentMeters(shape[0], shape[1]) + segmentMeters(shape[1], shape[2]);
    expect(arrows.length).toBe(Math.floor((total - 100) / 200) + 1);
    expect(arrows[0].bearing).toBeCloseTo(90);
    expect(arrows.at(-1).bearing).toBeCloseTo(0, 0);
    for (let i = 1; i < arrows.length; i++)
      expect(segmentMeters(arrows[i - 1].point, arrows[i].point)).toBeLessThanOrEqual(200.5);
  });

  it('skips invalid and repeated points', () => {
    expect(
      routeArrows([
        { lat: 1, lon: 1 },
        { lat: 1, lon: 1 },
        { lat: NaN, lon: 0 },
      ]),
    ).toEqual([]);
  });
});

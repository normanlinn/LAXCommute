import { describe, expect, it } from 'vitest';
import {
  DEFAULT_COMMUTE,
  boardingStops,
  decodePolyline,
  distanceMeters,
  mapsLink,
  nearestStop,
  normalizeCommute,
  savedBoardingStop,
  terminalKey,
} from '../src/domain/commute';

const stops = [
  { id: 1, name: 'Terminal B - Lower Level', lat: 33.943494, lon: -118.408172 },
  { id: 2, name: 'Terminal 3 - Lower Level', lat: 33.945029, lon: -118.405951 },
  { id: 3, name: 'East Lot Stop #1', lat: 33.953656, lon: -118.388307 },
  { id: 4, name: 'East Lot Layover', lat: 33.955134, lon: -118.388467 },
];
describe('saved and temporary boarding', () => {
  it('matches Terminal B with TBIT and returns the saved terminal stop', () => {
    expect(terminalKey('Terminal B (TBIT)')).toBe('B');
    expect(
      savedBoardingStop({ ...DEFAULT_COMMUTE, lot: 'East' }, stops, 'parking', 'East').id,
    ).toBe(1);
  });
  it('preserves a saved profile while finding a different nearby stop today', () => {
    const profile = { ...DEFAULT_COMMUTE, lot: 'East', terminalStopID: 1 };
    const nearby = nearestStop(boardingStops(stops, 'parking', 'East'), {
      lat: stops[1].lat,
      lon: stops[1].lon,
    });
    expect(nearby.id).toBe(2);
    expect(profile.terminalStopID).toBe(1);
    expect(savedBoardingStop(profile, stops, 'parking', 'East').id).toBe(1);
  });
  it('never reuses a stale saved ID from a different route', () => {
    expect(
      savedBoardingStop({ ...DEFAULT_COMMUTE, terminalStopID: 9 }, [stops[1]], 'parking', 'West'),
    ).toBeUndefined();
  });
  it('uses real lot boarding stops, excluding layovers', () => {
    expect(boardingStops(stops, 'work', 'East').map((s) => s.id)).toEqual([3]);
  });
  it('repairs malformed stored preferences and bounds walking time', () => {
    expect(
      normalizeCommute({ lot: 'bad', terminal: 'bad', walkingMinutes: 200, bufferMinutes: -5 }),
    ).toMatchObject({
      lot: 'South',
      terminal: 'Terminal B (TBIT)',
      walkingMinutes: 45,
      bufferMinutes: 0,
    });
  });
  it('computes distance and builds an Apple Maps link', () => {
    expect(distanceMeters(stops[0], stops[0])).toBe(0);
    expect(distanceMeters(stops[0], stops[1])).toBeGreaterThan(100);
    expect(mapsLink(stops[0])).toContain('https://maps.apple.com/');
  });
  it('decodes a standard route polyline and rejects malformed data', () => {
    expect(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@')).toEqual([
      { lat: 38.5, lon: -120.2 },
      { lat: 40.7, lon: -120.95 },
      { lat: 43.252, lon: -126.453 },
    ]);
    expect(decodePolyline('~')).toEqual([]);
  });
});

describe('shared South Lot boarding', () => {
  const south = { id: 10, name: 'South Lot Stop #1', lat: 33.94, lon: -118.4 };
  it.each(['East', 'West'])('defaults %s to its own lot while offering South stops', (lot) => {
    const own = { ...south, id: 20, name: `${lot} Lot Stop #1` };
    const routeStops = [
      south,
      { ...south, id: 11, name: 'South Lot Drop Off' },
      { ...south, id: 12, name: 'South Lot Layover' },
      own,
    ];
    expect(boardingStops(routeStops, 'work', lot).map((s) => s.id)).toEqual([20, 10]);
    expect(savedBoardingStop(DEFAULT_COMMUTE, routeStops, 'work', lot)).toEqual(own);
    // A South stop saved for a different route must not override the route's default.
    expect(
      savedBoardingStop({ ...DEFAULT_COMMUTE, parkingStopID: 10 }, routeStops, 'work', lot),
    ).toEqual(own);
    // Explicitly saved South boarding on this route is still respected.
    expect(
      savedBoardingStop({ ...DEFAULT_COMMUTE, lot, parkingStopID: 10 }, routeStops, 'work', lot),
    ).toEqual(south);
  });
  it('does not invent South stops absent from the selected route feed', () => {
    expect(boardingStops([stops[2]], 'work', 'East')).toEqual([stops[2]]);
    expect(boardingStops([south, stops[2]], 'work', 'South')).toEqual([south]);
  });
});

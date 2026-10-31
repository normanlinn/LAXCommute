import { describe, expect, it } from 'vitest';
import { walkingMinutesFrom } from '../src/domain/commute';

const NOW = Date.parse('2026-10-31T08:00:00Z');
const stop = { lat: 33.9425, lon: -118.4081 };
// ~500 m north of the stop.
const here = { lat: 33.947, lon: -118.4081, accuracy: 20, at: NOW - 60_000 };

describe('walk estimate from GPS', () => {
  it('turns a recent, precise fix into padded walking minutes', () => {
    // 500 m × 1.3 detour ÷ 80 m/min ≈ 8.1 → 9 min.
    expect(walkingMinutesFrom(here, stop, NOW)).toBe(9);
  });

  it('refuses stale, imprecise, distant or already-at-stop fixes', () => {
    expect(walkingMinutesFrom({ ...here, at: NOW - 11 * 60_000 }, stop, NOW)).toBeNull();
    expect(walkingMinutesFrom({ ...here, at: undefined }, stop, NOW)).toBeNull();
    expect(walkingMinutesFrom({ ...here, accuracy: 400 }, stop, NOW)).toBeNull();
    expect(walkingMinutesFrom({ ...here, lat: 33.99 }, stop, NOW)).toBeNull();
    expect(walkingMinutesFrom({ ...stop, accuracy: 10, at: NOW }, stop, NOW)).toBeNull();
    expect(walkingMinutesFrom(null, stop, NOW)).toBeNull();
  });
});

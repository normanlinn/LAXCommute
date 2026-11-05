// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import Arrivals from '../src/components/Arrivals';
import { DEFAULT_COMMUTE } from '../src/domain/commute';

afterEach(cleanup);

function setup({ dueInSeconds, atStop = false, userLocation = null, savedMinutesAgo = null }) {
  const now = Date.now();
  const updated = new Date(
    now - (savedMinutesAgo === null ? 3_000 : savedMinutesAgo * 60_000),
  ).toISOString();
  const stop = { id: 11319089, name: 'South Lot Stop #1', lat: 33.95313, lon: -118.393406 };
  const vehicle = {
    id: 11150,
    name: '8022',
    lastUpdated: updated,
    lat: atStop ? stop.lat : 33.944,
    lon: atStop ? stop.lon : -118.404,
  };
  const data = {
    routeID: 6885,
    stopID: stop.id,
    vehicleFetchedAt: updated,
    arrivalFetchedAt: updated,
    vehicles: [vehicle],
    arrivals: [],
    warnings: [],
    cached: savedMinutesAgo !== null,
    predictions: [
      {
        id: '6885:11150:' + (now + dueInSeconds * 1_000),
        vehicleID: vehicle.id,
        busName: vehicle.name,
        due: now + dueInSeconds * 1_000,
        scheduled: false,
        vehicleUpdated: Date.parse(updated),
      },
    ],
  };
  render(
    <Arrivals
      data={data}
      error={null}
      loading={false}
      fetching={false}
      stop={stop}
      direction="work"
      profile={DEFAULT_COMMUTE}
      userLocation={userLocation}
      onRefresh={vi.fn()}
    />,
  );
}

describe('arrival UI semantics', () => {
  it('shows an official ETA near zero as arriving instead of dropping it', () => {
    setup({ dueInSeconds: 10 });
    expect(screen.getByText('Arriving')).toBeTruthy();
    expect(screen.getByText('Bus 8022')).toBeTruthy();
  });

  it('separates nearby GPS from the provider next-loop prediction', () => {
    setup({ dueInSeconds: 26 * 60, atStop: true });
    expect(screen.getByText('26')).toBeTruthy();
    expect(screen.getByText(/may be for the next loop/)).toBeTruthy();
    expect(screen.getByText(/Boarding is not confirmed/)).toBeTruthy();
    expect(screen.queryByText('Arriving')).toBeNull();
  });

  it('does not show a proximity warning for a bus that is elsewhere', () => {
    setup({ dueInSeconds: 26 * 60, atStop: false });
    expect(screen.queryByText(/may be for the next loop/)).toBeNull();
  });

  it('tells screen readers when the next bus is close, without a per-second countdown', () => {
    setup({ dueInSeconds: 90 });
    const live = document.querySelector('[aria-live="polite"]');
    expect(live.textContent).toBe('Bus 8022 is about 2 min away.');
  });

  it('stays quiet for a bus that is still far away', () => {
    setup({ dueInSeconds: 20 * 60 });
    expect(document.querySelector('[aria-live="polite"]').textContent).toBe('');
  });

  it('advises when to leave from a recent GPS fix', () => {
    // ~450 m from the stop → about 8 min walk; the bus is 20 min out.
    setup({
      dueInSeconds: 20 * 60,
      userLocation: { lat: 33.949, lon: -118.393406, accuracy: 15, at: Date.now() },
    });
    expect(screen.getByText(/Leave in \d+ min/)).toBeTruthy();
    expect(screen.getByText(/min walk from where you are/)).toBeTruthy();
  });

  it('shows recent saved times as history, but hides hours-old ones', () => {
    setup({ dueInSeconds: 20 * 60, savedMinutesAgo: 3 });
    expect(screen.getByText('Last reported')).toBeTruthy();
    cleanup();
    setup({ dueInSeconds: 20 * 60, savedMinutesAgo: 665 });
    expect(screen.queryByText('Last reported')).toBeNull();
    expect(screen.getByText('Live times are reconnecting')).toBeTruthy();
  });
});

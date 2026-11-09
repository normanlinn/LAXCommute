// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getFallbackRoute } from '../src/services/shuttle';
import { useRoute } from '../src/hooks/useShuttle';
import { LanguageProvider } from '../src/i18n/LanguageProvider';
import StopReports from '../src/components/StopReports';
import OfficialTracker from '../src/components/OfficialTracker';
import { recentStopReports, REPORT_WINDOW_MS } from '../src/domain/stop-reports';
import { validStopReport } from '../supabase/functions/_shared/stop-report';

const { send, read } = vi.hoisted(() => ({
  send: vi.fn(async () => {}),
  read: vi.fn(async () => []),
}));
vi.mock('../src/services/community', () => ({ getStopReports: read, sendStopReport: send }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
  localStorage.clear();
});
function wrap(content) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <LanguageProvider>{content}</LanguageProvider>
    </QueryClientProvider>,
  );
}
it.each([6883, 6884, 6885])(
  'loads real saved boarding stops and map paths for route %s without a feed',
  (routeID) => {
    const route = getFallbackRoute(routeID);
    expect(route.stops.length).toBeGreaterThan(5);
    expect(route.paths[0].coordinates.length).toBeGreaterThan(50);
    expect(
      route.paths[0].coordinates.every(
        (p) => p.lat > 33.9 && p.lat < 34 && p.lon > -118.5 && p.lon < -118.3,
      ),
    ).toBe(true);
    expect(route.warning).toContain('saved');
    expect(route).not.toHaveProperty('vehicles');
  },
);
it('keeps route selection working when the backend returns 502', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ error: 'Unavailable' }, { status: 502 })),
  );
  function Probe() {
    const route = useRoute(6884);
    return (
      <p>
        {route.data?.stops.find((s) => s.name === 'East Lot Stop #1')?.name} {route.status}
      </p>
    );
  }
  wrap(<Probe />);
  await waitFor(() => expect(screen.getByText('East Lot Stop #1 success')).toBeTruthy());
});
it('expires observations at 15 minutes and rejects invalid or future timestamps', () => {
  const now = Date.now();
  const report = (time) => ({
    activity: 'arrived',
    occupancy: null,
    reportedAt: new Date(time).toISOString(),
  });
  expect(
    recentStopReports(
      [
        report(now - 1000),
        report(now - REPORT_WINDOW_MS),
        report(now + 1),
        { ...report(now), reportedAt: 'bad' },
      ],
      now,
    ),
  ).toHaveLength(1);
});
it('validates route-stop membership and crowd levels on the server', () => {
  expect(validStopReport({ routeId: 6884, stopId: 11319519, activity: 'arrived' })).toBe(true);
  expect(validStopReport({ routeId: 6883, stopId: 11319519, activity: 'arrived' })).toBe(false);
  expect(
    validStopReport({ routeId: 6884, stopId: 11319519, activity: 'crowding', occupancy: 'full' }),
  ).toBe(true);
  expect(validStopReport({ routeId: 6884, stopId: 11319519, activity: 'crowding' })).toBe(false);
});
it('submits a stop observation without GPS or a live vehicle and prevents rapid duplicate submissions', async () => {
  wrap(
    <StopReports
      routeId={6884}
      stop={{ id: 11319519, name: 'East Lot Stop #1', lat: 33.95, lon: -118.38 }}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: /East shuttle arrived/ }));
  await waitFor(() => expect(send).toHaveBeenCalledWith(6884, 11319519, 'arrived', undefined));
  await screen.findByText('Thanks! Your stop report was submitted.');
  expect(screen.getByRole('button', { name: /East shuttle arrived/ }).disabled).toBe(true);
});
it('opens official arrivals at the selected stop with general service guidance', () => {
  wrap(<OfficialTracker routeID={6884} stopID={11319519} retrying={false} onRetry={() => {}} />);
  expect(screen.getByRole('link', { name: 'View official live arrivals' }).href).toBe(
    'https://laxbus.syncromatics.com/route/6884/direction/east-lot/stop/11319519/arrivals',
  );
  expect(screen.getByText(/not an arrival prediction/)).toBeTruthy();
});
it.each([
  [6885, 'South'],
  [6884, 'East'],
  [6883, 'West'],
])('names the selected shuttle on both actions for route %s', (routeId, lot) => {
  wrap(
    <StopReports
      routeId={routeId}
      stop={{ id: 11319089, name: 'South Lot Stop #1', lat: 33.95, lon: -118.39 }}
    />,
  );
  expect(screen.getByRole('button', { name: new RegExp(`${lot} shuttle arrived`) })).toBeTruthy();
  expect(screen.getByRole('button', { name: new RegExp(`${lot} shuttle departed`) })).toBeTruthy();
  expect(screen.getByRole('button', { name: `Report ${lot} shuttle crowding` })).toBeTruthy();
  expect(screen.getByText(`${lot} Lot shuttle`)).toBeTruthy();
});

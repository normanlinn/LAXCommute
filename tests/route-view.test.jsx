// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import RouteView from '../src/components/RouteView';
import { createRouteProjection, routePathData } from '../src/domain/route-view';

const stops = [
  { id: 1, name: 'East Lot Stop #1', lat: 33.95, lon: -118.39 },
  { id: 2, name: 'South Lot Stop #1', lat: 33.94, lon: -118.4 },
];
const props = {
  route: { id: 6884, color: '#3262ab' },
  stops,
  paths: [{ id: 1, coordinates: stops }],
  vehicles: [],
  selectedStop: stops[0],
  userLocation: null,
  onSelectStop: vi.fn(),
  focusRequest: { mode: 'route', serial: 0 },
};
const now = new Date('2026-10-06T21:00:00Z');
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(now);
  window.matchMedia = vi.fn(() => ({
    matches: true,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  props.onSelectStop.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
it('projects real route geometry and breaks the line at invalid points', () => {
  const project = createRouteProjection(stops, props.paths);
  expect(project(stops[0]).x).toBeGreaterThan(project(stops[1]).x);
  expect(project(stops[0]).y).toBeLessThan(project(stops[1]).y);
  const path = routePathData([stops[0], { lat: NaN, lon: 0 }, stops[1]], project);
  expect(path.match(/M/g)).toHaveLength(2);
  expect(path).not.toContain('NaN');
  expect(createRouteProjection([], [])).toBeNull();
});
it('lets keyboard users select a boarding stop', () => {
  render(<RouteView {...props} />);
  const stop = screen.getByRole('button', { name: stops[1].name });
  fireEvent.keyDown(stop, { key: 'Enter' });
  expect(props.onSelectStop).toHaveBeenCalledWith(stops[1]);
  fireEvent.keyDown(stop, { key: ' ' });
  expect(props.onSelectStop).toHaveBeenCalledTimes(2);
});
it('removes individual expired buses without a network refresh', () => {
  const bus = {
    ...stops[0],
    id: 42,
    name: '8042',
    lastUpdated: new Date(Date.now() - 179_000).toISOString(),
  };
  render(<RouteView {...props} vehicles={[bus]} />);
  expect(screen.getByRole('img', { name: 'Bus 8042 · Reported GPS' })).toBeTruthy();
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.queryByRole('img', { name: 'Bus 8042 · Reported GPS' })).toBeNull();
});
it('moves to reported coordinates immediately with reduced motion', () => {
  const bus = {
    id: 42,
    name: '8042',
    lat: stops[0].lat,
    lon: stops[0].lon,
    lastUpdated: now.toISOString(),
  };
  const { rerender } = render(<RouteView {...props} vehicles={[bus]} />);
  const marker = screen.getByRole('img', { name: 'Bus 8042 · Reported GPS' });
  const before = marker.getAttribute('transform');
  rerender(<RouteView {...props} vehicles={[{ ...bus, lat: stops[1].lat, lon: stops[1].lon }]} />);
  expect(marker.getAttribute('transform')).not.toBe(before);
  expect(marker.querySelectorAll('circle')).toHaveLength(1);
});
it('shows approaching only for a fresh prediction and matching real bus', () => {
  const bus = {
    id: 42,
    name: '8042',
    lat: stops[0].lat,
    lon: stops[0].lon,
    lastUpdated: now.toISOString(),
  };
  const data = {
    arrivalFetchedAt: now.toISOString(),
    predictions: [{ vehicleID: 42, due: Date.now() + 120_000, scheduled: false }],
  };
  const { rerender } = render(<RouteView {...props} vehicles={[bus]} liveData={data} />);
  expect(screen.getByText('Bus approaching your stop')).toBeTruthy();
  act(() => vi.advanceTimersByTime(90_000));
  expect(screen.queryByText('Bus approaching your stop')).toBeNull();
  rerender(
    <RouteView
      {...props}
      vehicles={[]}
      liveData={{ ...data, arrivalFetchedAt: new Date().toISOString() }}
    />,
  );
  expect(screen.queryByText('Bus approaching your stop')).toBeNull();
});
it('does not draw invented paths when route lines are unavailable', () => {
  const { container } = render(<RouteView {...props} paths={[]} />);
  expect(container.querySelectorAll('.route-view-svg path')).toHaveLength(0);
  expect(
    screen.getByText('Route lines unavailable. Showing reported stops and buses.'),
  ).toBeTruthy();
});
it('aligns map tile corners and route markers with the same geographic projection', () => {
  const project = createRouteProjection(stops, props.paths);
  expect(project.tiles.length).toBeGreaterThan(0);
  expect(project.tiles.length).toBeLessThanOrEqual(12);
  for (const tile of project.tiles) {
    const count = 2 ** tile.zoom;
    const lon = (tile.column / count) * 360 - 180;
    const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * tile.row) / count))) * 180) / Math.PI;
    expect(project({ lat, lon }).x).toBeCloseTo(tile.x, 5);
    expect(project({ lat, lon }).y).toBeCloseTo(tile.y, 5);
  }
});
it('keeps the map image fixed when highlighting a location and reports failed background loading', () => {
  const { container, rerender } = render(<RouteView {...props} />);
  const image = container.querySelector('image');
  expect(image.getAttribute('href')).toMatch(/tile.openstreetmap.org\/\d+\/\d+\/\d+\.png/);
  const svg = image.closest('svg');
  expect(svg.getAttribute('viewBox')).toBe('0 0 600 420');
  rerender(
    <RouteView {...props} userLocation={stops[0]} focusRequest={{ mode: 'you', serial: 1 }} />,
  );
  expect(svg.getAttribute('viewBox')).toBe('0 0 600 420');
  expect(container.querySelector('.route-view-you').classList.contains('focused')).toBe(true);
  fireEvent.error(image);
  expect(screen.getByRole('status').textContent).toContain('Map background could not load');
  expect(screen.getByRole('link', { name: 'OpenStreetMap' })).toBeTruthy();
});

it('stops showing geometry loading when the route request has ended without usable data', () => {
  render(<RouteView {...props} stops={[]} paths={[]} routeLoading={false} />);
  expect(screen.queryByText('Loading route geometry…')).toBeNull();
  expect(screen.getByRole('status').textContent).toContain('Retry boarding stops below');
});

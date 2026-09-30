// @vitest-environment jsdom
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import * as L from 'leaflet';
import FreeMap from '../src/components/FreeMap';

const stops = [
  { id: 1, name: 'Terminal B - Lower Level', lat: 33.943494, lon: -118.408172 },
  { id: 2, name: 'South Lot Stop #1', lat: 33.95, lon: -118.39 },
];
const props = {
  route: { id: 6885, color: '#087969' },
  stops,
  paths: [{ coordinates: stops }],
  vehicles: [],
  selectedStop: stops[1],
  userLocation: null,
  onSelectStop: vi.fn(),
  focusRequest: { mode: 'route', serial: 0 },
};
beforeEach(() => {
  // JSDOM does not implement the SVG feature probe or real layout.
  L.Browser.svg = true;
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  window.matchMedia = vi.fn(() => ({ matches: true }));
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(450);
  props.onSelectStop.mockReset();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('interactive shuttle map', () => {
  it('survives StrictMode setup, displays attribution, and selects a real stop', () => {
    const { container } = render(
      <StrictMode>
        <FreeMap {...props} />
      </StrictMode>,
    );
    const stop = container.querySelector('[title="Terminal B - Lower Level"]');
    fireEvent.click(stop);
    expect(props.onSelectStop).toHaveBeenCalledWith(stops[0]);
    expect(container.querySelector('.leaflet-control-attribution').textContent).toContain(
      'OpenStreetMap',
    );
    expect(container.querySelectorAll('.leaflet-overlay-pane path')).toHaveLength(1);
    expect(container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(2);
  });

  it('moves existing bus markers by ID and removes old route markers on a route change', () => {
    const bus = {
      id: 55,
      name: '55',
      lat: 33.947,
      lon: -118.399,
      lastUpdated: new Date().toISOString(),
    };
    const { container, rerender } = render(<FreeMap {...props} vehicles={[bus]} />);
    const marker = container.querySelector('[title="Bus 55 · Reported GPS"]');
    const before = marker.style.cssText;
    rerender(<FreeMap {...props} vehicles={[{ ...bus, lat: 33.948 }]} />);
    expect(container.querySelector('[title="Bus 55 · Reported GPS"]')).toBe(marker);
    expect(marker.style.cssText).not.toBe(before);
    rerender(<FreeMap {...props} route={{ id: 6884, color: '#3262ab' }} stops={[]} paths={[]} />);
    expect(container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(0);
    expect(container.querySelectorAll('.leaflet-overlay-pane path')).toHaveLength(0);
  });

  it('expires a bus marker without needing another successful API response', () => {
    vi.useFakeTimers();
    const bus = {
      id: 55,
      lat: 33.947,
      lon: -118.399,
      lastUpdated: new Date(Date.now() - 179_950).toISOString(),
    };
    const { container } = render(<FreeMap {...props} vehicles={[bus]} />);
    expect(container.querySelector('[title="Bus 55 · Reported GPS"]')).toBeTruthy();
    act(() => vi.advanceTimersByTime(100));
    expect(container.querySelector('[title="Bus 55 · Reported GPS"]')).toBeNull();
    expect(container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(2);
  });

  it('treats external feed labels as text, not markup', () => {
    const label = '<img src=x onerror=alert(1)>';
    const { container } = render(<FreeMap {...props} stops={[{ ...stops[0], name: label }]} />);
    fireEvent.mouseOver(container.querySelector('.leaflet-marker-icon'));
    const tooltip = container.querySelector('.leaflet-tooltip');
    expect(tooltip.textContent).toBe(label);
    expect(tooltip.querySelector('img')).toBeNull();
  });
});

// @vitest-environment jsdom
import { StrictMode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import * as L from 'leaflet';
import FreeMap from '../src/components/FreeMap';
import { ThemeProvider, useTheme } from '../src/theme/ThemeProvider';
import { config } from '../src/config';
import { createSimpleBasemap } from '../src/components/simpleBasemap';
import LanguageSwitch from '../src/components/LanguageSwitch';
import { LanguageProvider } from '../src/i18n/LanguageProvider';

vi.mock('../src/components/simpleBasemap', () => ({ createSimpleBasemap: vi.fn() }));

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
  localStorage.clear();
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
  createSimpleBasemap.mockImplementation(() => {
    const layer = L.layerGroup([], {
      attribution: 'OpenFreeMap · © OpenMapTiles · © OpenStreetMap',
    });
    const events = new L.Evented();
    layer.getMaplibreMap = () => events;
    queueMicrotask(() => events.fire('load'));
    return layer;
  });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('interactive shuttle map', () => {
  it('translates labels without replacing the map or its boarding marker', async () => {
    const { container, getByRole } = render(
      <LanguageProvider>
        <LanguageSwitch />
        <FreeMap {...props} />
      </LanguageProvider>,
    );
    await act(async () => {});
    const map = container.querySelector('.leaflet-container');
    const marker = container.querySelector('.leaflet-marker-icon');
    fireEvent.click(getByRole('button', { name: 'မြန်မာ' }));
    expect(container.querySelector('.leaflet-container')).toBe(map);
    expect(container.querySelector('.leaflet-marker-icon')).toBe(marker);
    expect(container.querySelector('.boarding-label').textContent).toContain('South Lot Stop #1');
    expect(container.querySelector('.boarding-label').textContent).not.toContain('BOARD HERE');
    expect(container.querySelector('.leaflet-control-zoom-in').getAttribute('aria-label')).toMatch(
      /[\u1000-\u109f]/,
    );
    fireEvent.click(getByRole('button', { name: 'English' }));
    expect(container.querySelector('.boarding-label').textContent).toContain('BOARD HERE');
    expect(container.querySelector('.leaflet-container')).toBe(map);
  });
  it('survives StrictMode setup, displays attribution, and selects a real stop', async () => {
    const { container } = render(
      <StrictMode>
        <FreeMap {...props} />
      </StrictMode>,
    );
    await act(async () => {});
    expect(container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(1);
    fireEvent.click(container.querySelector('.map-stops-toggle'));
    const stop = container.querySelector('[title="Terminal B - Lower Level"]');
    fireEvent.click(stop);
    expect(props.onSelectStop).toHaveBeenCalledWith(stops[0]);
    expect(container.querySelector('.leaflet-control-attribution').textContent).toContain(
      'OpenStreetMap',
    );
    expect(container.querySelectorAll('.leaflet-overlay-pane path')).toHaveLength(2);
    expect(container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(2);
    expect(container.querySelector('.boarding-label').textContent).toContain('South Lot Stop #1');
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
    expect(container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(1);
  });

  it('treats external feed labels as text, not markup', () => {
    const label = '<img src=x onerror=alert(1)>';
    const { container } = render(
      <FreeMap
        {...props}
        stops={[{ ...stops[0], name: label }]}
        selectedStop={{ ...stops[0], name: label }}
      />,
    );
    fireEvent.mouseOver(container.querySelector('.leaflet-marker-icon'));
    const tooltip = container.querySelector('.leaflet-tooltip');
    expect(tooltip.textContent).toContain(label);
    expect(tooltip.querySelector('img')).toBeNull();
  });

  it('switches backgrounds without replacing the stop markers or losing the boarding label', async () => {
    const { container, getByRole } = render(<FreeMap {...props} />);
    await act(async () => {});
    const marker = container.querySelector('.leaflet-marker-icon');
    fireEvent.click(getByRole('button', { name: 'Street detail' }));
    expect(getByRole('button', { name: 'Street detail' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(container.querySelector('.leaflet-marker-icon')).toBe(marker);
    expect(container.querySelector('.boarding-label').textContent).toContain('BOARD HERE');
    expect(container.querySelector('.leaflet-tile').referrerPolicy).toBe('strict-origin');
    expect(container.querySelector('.leaflet-control-attribution').textContent).not.toContain(
      'OpenFreeMap',
    );
    fireEvent.click(getByRole('button', { name: 'Simple', exact: true }));
    await act(async () => {});
    expect(container.querySelector('.leaflet-marker-icon')).toBe(marker);
    expect(container.querySelector('.leaflet-control-attribution').textContent).toContain(
      'OpenFreeMap',
    );
  });

  it('falls back to street detail if the vector map cannot initialize', async () => {
    createSimpleBasemap.mockImplementation(() => {
      throw new Error('WebGL unavailable');
    });
    const { container, getByRole } = render(<FreeMap {...props} />);
    await act(async () => {});
    expect(getByRole('status').textContent).toContain('Simple map unavailable');
    expect(getByRole('button', { name: 'Street detail' }).getAttribute('aria-pressed')).toBe(
      'true',
    );
    expect(container.querySelectorAll('.leaflet-marker-icon')).toHaveLength(1);
    expect(container.querySelector('.leaflet-control-attribution').textContent).toContain(
      'OpenStreetMap',
    );
  });

  it('moves the persistent boarding label when another stop is selected', () => {
    const { container, rerender } = render(<FreeMap {...props} />);
    rerender(<FreeMap {...props} selectedStop={stops[0]} />);
    expect(container.querySelectorAll('.boarding-label')).toHaveLength(1);
    expect(container.querySelector('.boarding-label').textContent).toContain('Terminal B');
  });
});

function ThemeMap() {
  const { setPreference } = useTheme();
  return (
    <>
      <button onClick={() => setPreference('dark')}>Dark appearance</button>
      <FreeMap {...props} />
    </>
  );
}
it('changes only the basemap for dark mode and keeps the map and selected stop', async () => {
  window.matchMedia = vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
  const { container, getByRole } = render(
    <ThemeProvider>
      <ThemeMap />
    </ThemeProvider>,
  );
  await act(async () => {
    await Promise.resolve();
  });
  const map = container.querySelector('.leaflet-container');
  const marker = container.querySelector('.marker-selected');
  fireEvent.click(getByRole('button', { name: 'Dark appearance' }));
  await act(async () => {
    await Promise.resolve();
  });
  expect(createSimpleBasemap).toHaveBeenLastCalledWith(config.mapDarkStyleUrl);
  expect(container.querySelector('.leaflet-container')).toBe(map);
  expect(container.querySelector('.marker-selected')).toBe(marker);
});

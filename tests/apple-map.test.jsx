// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import AppleMap from '../src/components/AppleMap';
const state = vi.hoisted(() => ({ maps: [], appearance: 'light' }));
vi.mock('../src/config', () => ({ config: { appleMapsToken: 'test-token' } }));
vi.mock('../src/theme/ThemeProvider', () => ({
  useTheme: () => ({ appearance: state.appearance }),
}));
vi.mock('@apple/mapkit-loader', () => {
  class Coordinate {
    constructor(latitude, longitude) {
      Object.assign(this, { latitude, longitude });
    }
  }
  class Marker {
    constructor(coordinate, options) {
      Object.assign(this, { coordinate }, options);
    }
  }
  class Overlay {
    constructor(coordinates) {
      this.coordinates = coordinates;
    }
  }
  class Style {
    constructor(options) {
      Object.assign(this, options);
    }
  }
  class Map {
    constructor(_element, options) {
      Object.assign(this, options);
      this.annotations = [];
      this.overlays = [];
      this.destroy = vi.fn();
      state.maps.push(this);
    }
    addEventListener() {}
    removeEventListener() {}
    addAnnotation(marker) {
      this.annotations.push(marker);
    }
    removeAnnotation(marker) {
      this.annotations = this.annotations.filter((value) => value !== marker);
    }
    addOverlays(overlays) {
      this.overlays = overlays;
    }
    removeOverlays() {
      this.overlays = [];
    }
    showItems() {}
  }
  return {
    load: vi.fn(async () => ({
      Map,
      Coordinate,
      MarkerAnnotation: Marker,
      PolylineOverlay: Overlay,
      Style,
      Padding: class {},
    })),
  };
});
const stop = { id: 1, name: 'East Lot Stop #1', lat: 33.95, lon: -118.39 };
const bus = { ...stop, id: 42, name: '8042', lastUpdated: new Date().toISOString() };
const props = {
  route: { id: 6884, color: '#3262ab' },
  stops: [stop],
  paths: [{ id: 1, coordinates: [stop, { lat: 33.94, lon: -118.4 }] }],
  vehicles: [bus],
  selectedStop: stop,
  userLocation: null,
  focusRequest: { mode: 'route', serial: 0 },
  onSelectStop: vi.fn(),
};
beforeEach(() => {
  state.maps = [];
  state.appearance = 'light';
  window.matchMedia = vi.fn(() => ({ matches: true }));
});
afterEach(cleanup);
it('locks Apple Route view and preserves overlays when switching to interactive mode', async () => {
  const view = render(<AppleMap {...props} fixed />);
  await waitFor(() => expect(state.maps[0]?.annotations).toHaveLength(2));
  expect(state.maps[0].isScrollEnabled).toBe(false);
  expect(state.maps[0].isZoomEnabled).toBe(false);
  view.rerender(<AppleMap {...props} fixed={false} />);
  await waitFor(() => expect(state.maps[1]?.annotations).toHaveLength(2));
  expect(state.maps[0].destroy).toHaveBeenCalledOnce();
  expect(state.maps[1].isZoomEnabled).toBe(true);
  expect(state.maps[1].overlays).toHaveLength(1);
});
it('follows dark mode and moves a reported bus immediately for reduced motion', async () => {
  const view = render(<AppleMap {...props} fixed />);
  await waitFor(() => expect(state.maps[0]?.annotations).toHaveLength(2));
  state.appearance = 'dark';
  view.rerender(<AppleMap {...props} fixed vehicles={[{ ...bus, lat: 33.943 }]} />);
  expect(state.maps[0].colorScheme).toBe('dark');
  expect(
    state.maps[0].annotations.find((marker) => marker.data.busID === 42).coordinate.latitude,
  ).toBe(33.943);
});

import { describe, expect, it, vi } from 'vitest';
import { applyLaxMapStyle } from '../src/components/customMapStyle';

function sampleMap() {
  const map = {
    getStyle: () => ({
      layers: [
        { id: 'background', type: 'background' },
        { id: 'water', type: 'fill' },
        { id: 'landuse-park', type: 'fill' },
        { id: 'building', type: 'fill' },
        { id: 'transportation-motorway', type: 'line' },
        { id: 'transportation-secondary', type: 'line' },
        { id: 'place-city', type: 'symbol', layout: { 'text-field': ['get', 'name'] } },
        { id: 'poi-icon', type: 'symbol', layout: { 'icon-image': 'marker' } },
      ],
    }),
    setPaintProperty: vi.fn(),
  };
  return map;
}

describe('custom LAX vector map styling', () => {
  it('styles the dark ground, water, roads, and readable labels without changing icon-only layers', () => {
    const map = sampleMap();
    applyLaxMapStyle(map, 'dark');
    expect(map.setPaintProperty).toHaveBeenCalledWith('background', 'background-color', '#171e2a');
    expect(map.setPaintProperty).toHaveBeenCalledWith('water', 'fill-color', '#222e42');
    expect(map.setPaintProperty).toHaveBeenCalledWith('transportation-motorway', 'line-color', '#596986');
    expect(map.setPaintProperty).toHaveBeenCalledWith('place-city', 'text-color', '#edf2fb');
    expect(map.setPaintProperty.mock.calls.some(([name]) => name === 'poi-icon')).toBe(false);
  });

  it('uses a coordinated light palette rather than forcing dark mode', () => {
    const map = sampleMap();
    applyLaxMapStyle(map, 'light');
    expect(map.setPaintProperty).toHaveBeenCalledWith('background', 'background-color', '#eef3f6');
    expect(map.setPaintProperty).toHaveBeenCalledWith('transportation-secondary', 'line-color', '#fcfdfd');
  });
});

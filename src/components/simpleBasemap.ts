import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import 'maplibre-gl/dist/maplibre-gl.css';

setWorkerUrl(workerUrl);

// OpenFreeMap serves glyphs for Noto Sans only (Regular, Bold, Italic).
const MAJOR_FONT = ['Noto Sans Bold'];
const MINOR_FONT = ['Noto Sans Regular'];
// Place and street names are the labels riders navigate by; they get the bold face.
const MAJOR_LABEL =
  /place|city|town|village|suburb|neighbourhood|road|highway|street|transportation_name|airport|aerodrome/i;

function themeColor(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Restyles every text label to the app's fonts and the current theme's colors. */
function styleLabels(map: import('maplibre-gl').Map) {
  const label = themeColor('--ios-label', '#141a2a');
  const secondary = themeColor('--ios-secondary', '#62677a');
  const halo = themeColor('--ios-card', '#ffffff');
  for (const layer of map.getStyle()?.layers || []) {
    if (layer.type !== 'symbol' || !layer.layout?.['text-font']) continue;
    const major = MAJOR_LABEL.test(layer.id);
    map.setLayoutProperty(layer.id, 'text-font', major ? MAJOR_FONT : MINOR_FONT);
    map.setPaintProperty(layer.id, 'text-color', major ? label : secondary);
    map.setPaintProperty(layer.id, 'text-halo-color', halo);
    map.setPaintProperty(layer.id, 'text-halo-width', major ? 1.6 : 1.2);
    map.setPaintProperty(layer.id, 'text-halo-blur', 0.4);
  }
}

export function createSimpleBasemap(style: string) {
  const layer = maplibreGL({
    style,
    attributionControl: {
      customAttribution:
        '<a href="https://openfreemap.org/">OpenFreeMap</a> · ' +
        '<a href="https://openmaptiles.org/">© OpenMapTiles</a> · ' +
        '<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a>',
    },
  });
  // Follow theme and light/dark changes while the map is open.
  const themeWatch = new MutationObserver(() => {
    const gl = layer.getMaplibreMap();
    if (gl?.isStyleLoaded()) styleLabels(gl);
  });
  const add = layer.onAdd;
  layer.onAdd = function (map) {
    add.call(this, map);
    const gl = this.getMaplibreMap();
    gl?.on('load', () => styleLabels(gl));
    themeWatch.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'data-palette'],
    });
    return this;
  };
  // A failed WebGL constructor can leave the Leaflet layer partly mounted.
  // Keep removal safe so the street-detail fallback can still display.
  const remove = layer.onRemove;
  layer.onRemove = function (map) {
    themeWatch.disconnect();
    if (this.getMaplibreMap()) remove.call(this, map);
    else this.getContainer()?.remove();
    return this;
  };
  return layer;
}

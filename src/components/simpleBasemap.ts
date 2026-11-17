import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import 'maplibre-gl/dist/maplibre-gl.css';
import mediumLatin from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-500-normal.woff2?url';
import mediumLatinExt from '@fontsource/plus-jakarta-sans/files/plus-jakarta-sans-latin-ext-500-normal.woff2?url';

setWorkerUrl(workerUrl);

// OpenFreeMap serves glyphs for Noto Sans only (Regular, Bold, Italic). The map draws
// Latin text with the app's own Plus Jakarta Sans instead; any other script still comes
// from the Noto glyphs, so no label goes missing. In-map text uses refined medium weight
// instead of heavy bold for a modern, clean cartography look.
const LATIN = [
  'U+0000-00FF',
  'U+0131',
  'U+0152-0153',
  'U+02BB-02BC',
  'U+02C6',
  'U+02DA',
  'U+02DC',
  'U+2000-206F',
  'U+20AC',
  'U+2122',
  'U+2191',
  'U+2193',
  'U+2212',
  'U+2215',
];
const LATIN_EXT = ['U+0100-02BA', 'U+1E00-1E9F', 'U+1EF2-1EFF', 'U+20A0-20AB', 'U+A720-A7FF'];
const FONT_FACES = {
  'Noto Sans Bold': [
    { url: mediumLatin, 'unicode-range': LATIN },
    { url: mediumLatinExt, 'unicode-range': LATIN_EXT },
  ],
  'Noto Sans Regular': [
    { url: mediumLatin, 'unicode-range': LATIN },
    { url: mediumLatinExt, 'unicode-range': LATIN_EXT },
  ],
};
const MAP_FONT = ['Noto Sans Regular'];
const MAJOR_LABEL =
  /place|city|town|village|suburb|neighbourhood|road|highway|street|transportation_name|airport|aerodrome/i;

function themeColor(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}

/** Restyles every text label to the app's fonts and the current theme's colors without heavy bold. */
function styleLabels(map: import('maplibre-gl').Map) {
  const label = themeColor('--ios-label', '#141a2a');
  const secondary = themeColor('--ios-secondary', '#62677a');
  const halo = themeColor('--ios-card', '#ffffff');
  for (const layer of map.getStyle()?.layers || []) {
    if (layer.type !== 'symbol' || !layer.layout?.['text-font']) continue;
    const major = MAJOR_LABEL.test(layer.id);
    map.setLayoutProperty(layer.id, 'text-font', MAP_FONT);
    map.setPaintProperty(layer.id, 'text-color', major ? label : secondary);
    map.setPaintProperty(layer.id, 'text-halo-color', halo);
    map.setPaintProperty(layer.id, 'text-halo-width', major ? 1.0 : 0.8);
    map.setPaintProperty(layer.id, 'text-halo-blur', 0.2);
    map.setLayoutProperty(layer.id, 'text-letter-spacing', 0.03);
  }
}

// Font files load inside MapLibre's own requests, so they need full URLs.
function absolute(faces: typeof FONT_FACES) {
  return Object.fromEntries(
    Object.entries(faces).map(([name, files]) => [
      name,
      files.map((file) => ({ ...file, url: new URL(file.url, location.href).href })),
    ]),
  );
}

/** Paints land, water, parks and roads in the theme's map colors (--ios-map-* tokens). */
function styleBase(map: import('maplibre-gl').Map) {
  const color = {
    land: themeColor('--ios-map-land', '#eef0ec'),
    road: themeColor('--ios-map-road', '#ffffff'),
    casing: themeColor('--ios-map-casing', '#dcdfd8'),
    park: themeColor('--ios-map-park', '#d9ebd3'),
    water: themeColor('--ios-map-water', '#c7ddf2'),
    building: themeColor('--ios-map-building', '#e3e5e0'),
  };
  type PaintKey = Parameters<import('maplibre-gl').Map['setPaintProperty']>[1];
  const paint = (id: string, property: PaintKey, value: string) => {
    if (map.getLayer(id)) map.setPaintProperty(id, property, value);
  };
  paint('background', 'background-color', color.land);
  paint('landuse_residential', 'fill-color', color.land);
  for (const id of ['park', 'landcover_wood']) paint(id, 'fill-color', color.park);
  paint('water', 'fill-color', color.water);
  paint('waterway', 'line-color', color.water);
  for (const id of ['building', 'aeroway-area']) paint(id, 'fill-color', color.building);
  for (const layer of map.getStyle()?.layers || []) {
    if (layer.type !== 'line') continue;
    if (/casing/.test(layer.id)) paint(layer.id, 'line-color', color.casing);
    else if (/^(highway|tunnel|road|aeroway)/.test(layer.id))
      paint(layer.id, 'line-color', color.road);
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
    if (gl?.isStyleLoaded()) {
      styleBase(gl);
      styleLabels(gl);
    }
  });
  const add = layer.onAdd;
  layer.onAdd = function (map) {
    add.call(this, map);
    const gl = this.getMaplibreMap();
    gl?.on('load', () => {
      gl.setFontFaces(absolute(FONT_FACES));
      styleBase(gl);
      styleLabels(gl);
    });
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

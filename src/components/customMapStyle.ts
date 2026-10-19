import type { Map as MapLibreMap } from 'maplibre-gl';

/**
 * LAXCommute's own map palette applied to licensed OpenFreeMap vector layers.
 * The underlying tiles, attribution, and feed-supplied GPS data are unchanged.
 * Match semantic layer IDs and source-layers so upstream style updates remain usable.
 */
const palettes = {
  dark: {
    ground: '#171e2a',
    water: '#222e42',
    park: '#202f34',
    airport: '#283345',
    building: '#273142',
    landuse: '#202936',
    localRoad: '#394557',
    arterialRoad: '#4a5870',
    highway: '#596986',
    casing: '#121a25',
    railway: '#313c4d',
    label: '#aab8d0',
    placeLabel: '#edf2fb',
    halo: '#18212e',
  },
  light: {
    ground: '#eef3f6',
    water: '#cadde8',
    park: '#dbe8de',
    airport: '#e1e7ec',
    building: '#d5dce4',
    landuse: '#e6ecee',
    localRoad: '#ffffff',
    arterialRoad: '#fcfdfd',
    highway: '#b7c8d7',
    casing: '#c5d1db',
    railway: '#b4c0ca',
    label: '#667386',
    placeLabel: '#30445c',
    halo: '#f4f7f8',
  },
} as const;

export function applyLaxMapStyle(
  map: Pick<MapLibreMap, 'getStyle' | 'setPaintProperty'>,
  appearance: 'light' | 'dark',
) {
  const colors = palettes[appearance];
  for (const layer of map.getStyle()?.layers ?? []) {
    const sourceLayer = 'source-layer' in layer ? layer['source-layer'] || '' : '';
    const name = (layer.id + ' ' + sourceLayer).toLowerCase();
    const paint = (property: string, color: string | number) =>
      map.setPaintProperty(layer.id, property, color);

    if (layer.type === 'background') {
      paint('background-color', colors.ground);
    } else if (layer.type === 'fill') {
      if (/water|ocean|lake|reservoir/.test(name)) {
        paint('fill-color', colors.water);
      } else if (/park|green|forest|grass|wood|garden|recreation/.test(name)) {
        paint('fill-color', colors.park);
      } else if (/airport|aeroway|runway|apron/.test(name)) {
        paint('fill-color', colors.airport);
      } else if (/building/.test(name)) {
        paint('fill-color', colors.building);
      } else if (/landuse|landcover/.test(name)) {
        paint('fill-color', colors.landuse);
      }
    } else if (layer.type === 'line') {
      if (/rail|subway/.test(name)) {
        paint('line-color', colors.railway);
      } else if (/road|transportation|highway|motorway|trunk|street/.test(name)) {
        if (/casing|outline|border/.test(name)) {
          paint('line-color', colors.casing);
        } else if (/motorway|trunk|primary|expressway|highway/.test(name)) {
          paint('line-color', colors.highway);
        } else if (/secondary|tertiary|arterial/.test(name)) {
          paint('line-color', colors.arterialRoad);
        } else {
          paint('line-color', colors.localRoad);
        }
      } else if (/waterway|river|stream/.test(name)) {
        paint('line-color', colors.water);
      }
    } else if (layer.type === 'symbol' && layer.layout && 'text-field' in layer.layout) {
      const isPlace = /place|city|town|airport|settlement/.test(name);
      paint('text-color', isPlace ? colors.placeLabel : colors.label);
      paint('text-halo-color', colors.halo);
      paint('text-halo-width', 1.2);
    }
  }
}

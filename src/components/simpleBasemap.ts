import { setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { maplibreGL } from '@maplibre/maplibre-gl-leaflet';
import 'maplibre-gl/dist/maplibre-gl.css';

setWorkerUrl(workerUrl);

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
  // A failed WebGL constructor can leave the Leaflet layer partly mounted.
  // Keep removal safe so the street-detail fallback can still display.
  const remove = layer.onRemove;
  layer.onRemove = function (map) {
    if (this.getMaplibreMap()) remove.call(this, map);
    else this.getContainer()?.remove();
    return this;
  };
  return layer;
}

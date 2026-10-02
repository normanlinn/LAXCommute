import type { MapProps } from '../types';
import { memo, useEffect, useRef, useState } from 'react';
import { ExternalLink, Map as MapIcon } from 'lucide-react';
import { config } from '../config';
import { mapsLink } from '../domain/commute';
import { validVehicle } from '../domain/arrivals';

import type { MapKit } from '@apple/mapkit-loader';
type AppleState = {
  map: InstanceType<MapKit['Map']>;
  mapkit: MapKit;
  markers: Map<string, InstanceType<MapKit['MarkerAnnotation']>>;
  overlays: InstanceType<MapKit['PolylineOverlay']>[];
  select: EventListener;
};
let frameworkPromise: Promise<MapKit> | null;
function loadFramework() {
  frameworkPromise ||= import('@apple/mapkit-loader')
    .then(({ load }) =>
      load({
        token: config.appleMapsToken,
        libraries: ['map', 'annotations', 'overlays'],
      }),
    )
    .catch((error) => {
      frameworkPromise = null;
      throw error;
    });
  return frameworkPromise;
}

function AppleMap({
  route,
  stops,
  paths,
  vehicles,
  selectedStop,
  userLocation,
  onSelectStop,
  focusRequest,
}: MapProps) {
  const element = useRef<HTMLDivElement>(null);
  const state = useRef<AppleState | null>(null);
  const selectionHandler = useRef(onSelectStop);
  selectionHandler.current = onSelectStop;
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!config.appleMapsToken) return;
    let alive = true;
    let current: AppleState | undefined;
    loadFramework()
      .then((mapkit) => {
        if (!alive) return;
        const map = new mapkit.Map(element.current!, {
          center: new mapkit.Coordinate(33.949, -118.399),
          cameraDistance: 6_000,
          colorScheme: 'light',
          isRotationEnabled: false,
          showsMapTypeControl: false,
        });
        const select: AppleState['select'] = (event) => {
          const stop = (
            event as Event & { annotation?: { data?: { stop?: import('../types').Stop } } }
          ).annotation?.data?.stop;
          if (stop) selectionHandler.current(stop);
        };
        map.addEventListener('select', select);
        current = { map, mapkit, markers: new globalThis.Map(), overlays: [], select };
        state.current = current;
        setReady(true);
      })
      .catch(() => {
        if (alive) setError('Apple Maps could not load. Check your connection and Maps token.');
      });
    return () => {
      alive = false;
      if (current) {
        current.map.removeEventListener('select', current.select);
        current.map.destroy();
      }
      state.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready || !state.current) return;
    const { map, mapkit, markers } = state.current;
    const wanted = new Set();
    const upsert = (
      key: string,
      lat: number,
      lon: number,
      options: ConstructorParameters<MapKit['MarkerAnnotation']>[1],
    ) => {
      wanted.add(key);
      let marker = markers.get(key);
      if (!marker) {
        marker = new mapkit.MarkerAnnotation(new mapkit.Coordinate(lat, lon), options);
        markers.set(key, marker);
        map.addAnnotation(marker);
      } else {
        if (marker.coordinate.latitude !== lat || marker.coordinate.longitude !== lon)
          marker.coordinate = new mapkit.Coordinate(lat, lon);
        Object.assign(marker, options);
      }
    };
    for (const stop of stops)
      upsert(`stop-${stop.id}`, stop.lat, stop.lon, {
        title: stop.name,
        subtitle: stop.id === selectedStop?.id ? 'Your boarding stop' : 'Tap for departures',
        color: stop.id === selectedStop?.id ? route.color : '#718181',
        glyphText: '•',
        data: { stop },
      });
    for (const bus of vehicles.filter((v) => validVehicle(v)))
      upsert(`bus-${bus.id}`, bus.lat, bus.lon, {
        title: `Bus ${bus.name || bus.id}`,
        subtitle: `GPS ${new Date(bus.lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`,
        color: route.color,
        glyphText: 'B',
        data: { busID: bus.id },
      });
    if (userLocation)
      upsert('you', userLocation.lat, userLocation.lon, {
        title: 'Your location',
        subtitle: 'Location snapshot',
        color: '#266beb',
        glyphText: '●',
      });
    for (const [key, marker] of markers)
      if (!wanted.has(key)) {
        map.removeAnnotation(marker);
        markers.delete(key);
      }
    // Expire GPS markers even if the last successful response is still on screen.
    const expiration = setTimeout(() => {
      for (const [key, marker] of markers) {
        if (!key.startsWith('bus-')) continue;
        const bus = vehicles.find((v) => v.id === (marker.data as { busID?: number })?.busID);
        if (!bus || !validVehicle(bus)) {
          map.removeAnnotation(marker);
          markers.delete(key);
        }
      }
    }, 30_000);
    return () => clearTimeout(expiration);
  }, [ready, stops, vehicles, selectedStop, userLocation, route.color]);
  useEffect(() => {
    if (!ready || !state.current) return;
    const { map, mapkit } = state.current;
    map.removeOverlays(state.current.overlays);
    const overlays = paths.map(
      (path) =>
        new mapkit.PolylineOverlay(
          path.coordinates.map((p) => new mapkit.Coordinate(p.lat, p.lon)),
          {
            style: new mapkit.Style({ strokeColor: route.color, lineWidth: 5, strokeOpacity: 0.8 }),
          },
        ),
    );
    map.addOverlays(overlays);
    state.current.overlays = overlays;
    if (overlays.length)
      map.showItems(overlays, { animate: false, padding: new mapkit.Padding(60, 36, 80, 36) });
  }, [ready, paths, route.id, route.color]);
  useEffect(() => {
    if (!ready || !state.current || !focusRequest.serial) return;
    const { map, mapkit, markers } = state.current;
    const target =
      focusRequest.mode === 'you'
        ? markers.get('you')
        : focusRequest.mode === 'stop'
          ? markers.get(`stop-${selectedStop?.id}`)
          : null;
    const animate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (target)
      map.showItems([target], { animate, minimumSpan: new mapkit.CoordinateSpan(0.007, 0.007) });
    else if (focusRequest.mode === 'route')
      map.showItems(
        [
          ...state.current.overlays,
          ...stops
            .map((s) => markers.get(`stop-${s.id}`))
            .filter((marker): marker is InstanceType<MapKit['MarkerAnnotation']> =>
              Boolean(marker),
            ),
        ],
        { animate, padding: new mapkit.Padding(60, 36, 80, 36) },
      );
  }, [ready, focusRequest]); // Focus changes only on explicit user actions.
  return (
    <div className="map-surface">
      <div
        ref={element}
        className="apple-map"
        aria-label="Apple map showing LAX shuttle stops and reported bus positions"
      />
      {(!config.appleMapsToken || error || !ready) && (
        <div className="map-placeholder">
          <div className="map-symbol">
            <MapIcon size={36} strokeWidth={1.4} />
          </div>
          <span className="eyebrow">APPLE MAPS</span>
          <h2>
            {error
              ? 'Map unavailable'
              : config.appleMapsToken
                ? 'Opening your map…'
                : 'Your airport, at a glance.'}
          </h2>
          <p>
            {error ||
              (config.appleMapsToken
                ? 'Loading the Apple map.'
                : 'The embedded map needs an Apple Maps token. You can check live departures below while it’s being connected.')}
          </p>
          {!ready && (
            <a
              href={mapsLink(selectedStop)}
              target="_blank"
              rel="noreferrer"
              className="btn btn-soft button button-light"
            >
              Open Apple Maps <ExternalLink size={15} />
            </a>
          )}
        </div>
      )}
      {ready && (
        <div className="map-hint">
          <span className="dot" /> Reported GPS positions · tap a stop
        </div>
      )}
    </div>
  );
}
export default memo(AppleMap);

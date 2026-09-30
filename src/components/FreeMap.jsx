import { memo, useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { config } from '../config';
import { GPS_TTL_MS, validVehicle } from '../domain/arrivals';

const coordinates = (point) => [point.lat, point.lon];
const validPoint = (point) =>
  Number.isFinite(point.lat) &&
  Number.isFinite(point.lon) &&
  Math.abs(point.lat) <= 90 &&
  Math.abs(point.lon) <= 180;
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function markerIcon(kind, color, selected) {
  const content = document.createElement('span');
  content.className = `map-marker-dot marker-${kind}${selected ? ' marker-selected' : ''}`;
  content.style.setProperty('--marker-color', color);
  if (kind === 'bus') content.textContent = 'B';
  return L.divIcon({
    html: content,
    className: 'shuttle-marker',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function fitRoute(map, stops, paths, animate = false) {
  const points = [...stops, ...paths.flatMap((path) => path.coordinates)].filter(validPoint);
  if (points.length)
    map.fitBounds(L.latLngBounds(points.map(coordinates)), {
      padding: [38, 58],
      maxZoom: 16,
      animate,
    });
}

function FreeMap({
  route,
  stops,
  paths,
  vehicles,
  selectedStop,
  userLocation,
  onSelectStop,
  focusRequest,
}) {
  const element = useRef(null);
  const state = useRef(null);
  const selectionHandler = useRef(onSelectStop);
  selectionHandler.current = onSelectStop;
  const latest = useRef(null);
  latest.current = { stops, paths, selectedStop, userLocation };
  const [ready, setReady] = useState(false);
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    const motion = !reducedMotion();
    const map = L.map(element.current, {
      center: [33.949, -118.399],
      zoom: 13,
      zoomControl: false,
      zoomAnimation: motion,
      fadeAnimation: motion,
      markerZoomAnimation: motion,
      inertia: motion,
    });
    L.control.zoom({ position: 'topright' }).addTo(map);
    // Browser requests preserve the Referer and normal HTTP tile caching. Only
    // visible tiles load: no offline download, proxy, or speculative prefetch.
    const tiles = L.tileLayer(config.mapTileUrl, {
      attribution: config.mapAttribution,
      maxZoom: 19,
      updateWhenIdle: true,
      updateWhenZooming: false,
      keepBuffer: 0,
    }).addTo(map);
    tiles.on('tileerror', () => setTileError(true));
    tiles.on('tileload', () => setTileError(false));
    const overlays = L.layerGroup().addTo(map);
    state.current = { map, overlays, markers: new Map() };
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(element.current);
    setReady(true);
    return () => {
      observer.disconnect();
      tiles.off();
      map.remove();
      state.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !state.current) return;
    const { map, markers } = state.current;
    const wanted = new Set();
    const upsert = (key, point, kind, title, selected = false) => {
      if (!validPoint(point)) return;
      wanted.add(key);
      const color = kind === 'you' ? '#266beb' : route.color;
      const appearance = `${kind}:${color}:${selected}`;
      let entry = markers.get(key);
      if (!entry) {
        const marker = L.marker(coordinates(point), {
          icon: markerIcon(kind, color, selected),
          title,
          keyboard: kind === 'stop',
          interactive: kind === 'stop',
          zIndexOffset: kind === 'bus' ? 500 : selected ? 1500 : 1000,
        }).addTo(map);
        const label = document.createElement('span');
        label.textContent = title;
        marker.bindTooltip(label, { direction: 'top', offset: [0, -14] });
        entry = { marker, label, point, appearance, title };
        markers.set(key, entry);
        if (kind === 'stop') marker.on('click', () => selectionHandler.current(entry.point));
      } else {
        entry.marker.options.title = title;
        if (entry.point.lat !== point.lat || entry.point.lon !== point.lon)
          entry.marker.setLatLng(coordinates(point));
        if (entry.appearance !== appearance) {
          entry.marker.setIcon(markerIcon(kind, color, selected));
          entry.marker.setZIndexOffset(kind === 'bus' ? 500 : selected ? 1500 : 1000);
          entry.appearance = appearance;
        }
        if (entry.title !== title) {
          entry.label.textContent = title;
          entry.marker.getElement().title = title;
          entry.title = title;
        }
        entry.point = point;
      }
    };
    for (const stop of stops)
      upsert(
        `stop-${stop.id}`,
        stop,
        'stop',
        `${stop.name}${stop.id === selectedStop?.id ? ' · Your boarding stop' : ''}`,
        stop.id === selectedStop?.id,
      );
    for (const bus of vehicles.filter((vehicle) => validVehicle(vehicle)))
      upsert(`bus-${bus.id}`, bus, 'bus', `Bus ${bus.name || bus.id} · Reported GPS`);
    if (userLocation) upsert('you', userLocation, 'you', 'Your location snapshot');
    for (const [key, entry] of markers)
      if (!wanted.has(key)) {
        entry.marker.remove();
        markers.delete(key);
      }

    // Remove each bus as its reported GPS expires, even if refresh is failing.
    let expiration;
    const expire = () => {
      let next = Infinity;
      for (const [key, entry] of markers) {
        if (!key.startsWith('bus-')) continue;
        if (!validVehicle(entry.point)) {
          entry.marker.remove();
          markers.delete(key);
        } else next = Math.min(next, Date.parse(entry.point.lastUpdated) + GPS_TTL_MS - Date.now());
      }
      if (Number.isFinite(next)) expiration = setTimeout(expire, Math.max(1, next));
    };
    expire();
    return () => clearTimeout(expiration);
  }, [ready, stops, vehicles, selectedStop, userLocation, route.color]);

  useEffect(() => {
    if (!ready || !state.current) return;
    const { map, overlays } = state.current;
    overlays.clearLayers();
    for (const path of paths) {
      const points = path.coordinates.filter(validPoint).map(coordinates);
      if (points.length > 1)
        L.polyline(points, { color: route.color, weight: 5, opacity: 0.8 }).addTo(overlays);
    }
    fitRoute(map, stops, paths);
  }, [ready, paths, stops, route.id, route.color]);

  useEffect(() => {
    if (!ready || !state.current || !focusRequest.serial) return;
    const { map } = state.current;
    const { stops, paths, selectedStop, userLocation } = latest.current;
    const target =
      focusRequest.mode === 'you'
        ? userLocation
        : focusRequest.mode === 'stop'
          ? selectedStop
          : null;
    const animate = !reducedMotion();
    if (target && validPoint(target)) map.setView(coordinates(target), 16, { animate });
    else if (focusRequest.mode === 'route') fitRoute(map, stops, paths, animate);
  }, [ready, focusRequest]); // Camera changes only when the user requests them.

  return (
    <div className="map-surface">
      <div
        ref={element}
        className="shuttle-map"
        role="region"
        aria-label="Interactive LAX shuttle map with boarding stops and reported bus positions"
      />
      {ready && (
        <div className="map-hint">
          <span className="dot" /> Reported GPS · tap a stop
        </div>
      )}
      {tileError && (
        <p className="map-tile-warning" role="status">
          Map images couldn’t load. Stops and departure times remain available.
        </p>
      )}
    </div>
  );
}

export default memo(FreeMap);

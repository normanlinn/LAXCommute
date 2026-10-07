import { useTheme } from '../theme/ThemeProvider';
import { useLanguage } from '../i18n/LanguageProvider';
import type { MapProps, Point, Stop, RoutePath } from '../types';
import { memo, useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import { animate } from 'animejs';
import 'leaflet/dist/leaflet.css';
import { config } from '../config';
import { GPS_TTL_MS, validVehicle } from '../domain/arrivals';

const coordinates = (point: Point): L.LatLngTuple => [point.lat, point.lon];
const validPoint = (point: Point) =>
  Number.isFinite(point.lat) &&
  Number.isFinite(point.lon) &&
  Math.abs(point.lat) <= 90 &&
  Math.abs(point.lon) <= 180;
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function markerIcon(kind: string, color: string, selected: boolean) {
  const content = document.createElement('span');
  content.className = `map-marker-dot marker-${kind}${selected ? ' marker-selected' : ''}`;
  content.style.setProperty('--marker-color', color);
  if (kind === 'bus') {
    // Fixed artwork only; all feed-supplied names are inserted as text below.
    content.innerHTML =
      '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="5" y="3" width="14" height="16" rx="3"/><path d="M5 11h14M8 19v2m8-2v2M8 6h8"/><circle cx="8.5" cy="15" r="1"/><circle cx="15.5" cy="15" r="1"/></svg>';
  }
  return L.divIcon({
    html: content,
    className: 'shuttle-marker',
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function fitRoute(map: L.Map, stops: Stop[], paths: RoutePath[], animate = false) {
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
}: MapProps) {
  const { t } = useLanguage();
  const { appearance } = useTheme();
  const element = useRef<HTMLDivElement>(null);
  type MarkerPoint = Point & { id?: number; name?: string; lastUpdated?: string };
  type Entry = {
    marker: L.Marker;
    point: MarkerPoint;
    appearance: string;
    title?: string;
    selected?: boolean;
    animation?: ReturnType<typeof animate>;
  };
  const state = useRef<{ map: L.Map; overlays: L.LayerGroup; markers: Map<string, Entry> } | null>(
    null,
  );
  const selectionHandler = useRef(onSelectStop);
  selectionHandler.current = onSelectStop;
  const latest = useRef({ stops, paths, selectedStop, userLocation });
  latest.current = { stops, paths, selectedStop, userLocation };
  const [ready, setReady] = useState(false);
  const [tileError, setTileError] = useState(false);
  const [showStops, setShowStops] = useState(false);
  const [basemap, setBasemap] = useState('simple');
  const [simpleUnavailable, setSimpleUnavailable] = useState(false);

  useEffect(() => {
    const motion = !reducedMotion();
    const map = L.map(element.current!, {
      center: [33.949, -118.399],
      zoom: 13,
      minZoom: 2,
      maxZoom: 19,
      zoomControl: false,
      zoomAnimation: motion,
      fadeAnimation: motion,
      markerZoomAnimation: motion,
      inertia: motion,
    });
    L.control.zoom({ position: 'topright' }).addTo(map);
    const overlays = L.layerGroup().addTo(map);
    state.current = { map, overlays, markers: new Map() };
    const observer = new ResizeObserver(() => map.invalidateSize({ pan: false }));
    observer.observe(element.current!);
    setReady(true);
    return () => {
      observer.disconnect();
      for (const entry of state.current?.markers.values() || []) entry.animation?.cancel();
      map.remove();
      state.current = null;
    };
  }, []);

  useEffect(() => {
    if (!ready || !state.current) return;
    const { map } = state.current;
    let cancelled = false;
    let layer: L.Layer | undefined;
    let gl: import('maplibre-gl').Map | undefined;
    let deadline: ReturnType<typeof setTimeout> | undefined;
    setTileError(false);
    const fallback = () => {
      if (cancelled) return;
      setSimpleUnavailable(true);
      setBasemap('detailed');
    };
    if (basemap === 'simple') {
      deadline = setTimeout(fallback, 15_000);
      import('./simpleBasemap')
        .then(({ createSimpleBasemap }) => {
          if (cancelled) return;
          const simpleLayer = createSimpleBasemap(
            appearance === 'dark' ? config.mapDarkStyleUrl : config.mapStyleUrl,
          );
          layer = simpleLayer;
          layer.addTo(map);
          gl = simpleLayer.getMaplibreMap();
          gl.on('load', () => clearTimeout(deadline));
          gl.on('error', fallback);
        })
        .catch(fallback);
    } else {
      // Visible tiles only, with normal browser caching and attribution.
      layer = L.tileLayer(config.mapTileUrl, {
        attribution: config.mapAttribution,
        maxZoom: 19,
        updateWhenIdle: true,
        updateWhenZooming: false,
        keepBuffer: 0,
      }).addTo(map);
      layer.on('tileerror', () => setTileError(true));
      layer.on('tileload', () => setTileError(false));
    }
    return () => {
      cancelled = true;
      clearTimeout(deadline);
      gl?.off('error', fallback);
      layer?.remove();
    };
  }, [ready, basemap, appearance]);

  useEffect(() => {
    if (!ready || !state.current) return;
    const { map, markers } = state.current;
    const wanted = new Set();
    const upsert = (
      key: string,
      point: MarkerPoint,
      kind: string,
      title: string,
      selected = false,
    ) => {
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
        entry = { marker, point, appearance };
        markers.set(key, entry);
        if (kind === 'stop')
          marker.on('click', () => {
            const current = markers.get(key)?.point;
            if (current?.id !== undefined && current.name)
              selectionHandler.current({ ...current, id: current.id, name: current.name });
          });
      } else {
        entry.marker.options.title = title;
        if (entry.point.lat !== point.lat || entry.point.lon !== point.lon) {
          entry.animation?.cancel();
          if (kind === 'bus' && !reducedMotion() && !document.hidden) {
            const start = entry.marker.getLatLng();
            const moving = { lat: start.lat, lon: start.lng };
            const marker = entry.marker;
            entry.animation = animate(moving, {
              lat: point.lat,
              lon: point.lon,
              duration: 900,
              ease: 'outCubic',
              onUpdate: () => marker.setLatLng(coordinates(moving)),
            });
          } else entry.marker.setLatLng(coordinates(point));
        }
        if (entry.appearance !== appearance) {
          entry.marker.setIcon(markerIcon(kind, color, selected));
          entry.marker.setZIndexOffset(kind === 'bus' ? 500 : selected ? 1500 : 1000);
          entry.appearance = appearance;
        }
        entry.point = point;
      }
      if (entry.title !== title || entry.selected !== selected) {
        const label = document.createElement('span');
        if (selected) {
          const caption = document.createElement('small');
          caption.textContent = t('BOARD HERE');
          label.append(caption, document.createTextNode(point.name || ''));
        } else label.textContent = title;
        entry.marker.unbindTooltip();
        entry.marker.bindTooltip(label, {
          direction: 'top',
          offset: [0, selected ? -18 : -14],
          permanent: selected,
          className: selected ? 'boarding-label' : '',
        });
        const markerElement = entry.marker.getElement();
        if (markerElement) markerElement.title = title;
        entry.title = title;
        entry.selected = selected;
      }
    };
    for (const stop of stops.filter((stop) => showStops || stop.id === selectedStop?.id))
      upsert(
        `stop-${stop.id}`,
        stop,
        'stop',
        `${stop.name}${stop.id === selectedStop?.id ? ` · ${t('Your boarding stop')}` : ''}`,
        stop.id === selectedStop?.id,
      );
    for (const bus of vehicles.filter((vehicle) => validVehicle(vehicle)))
      upsert(
        `bus-${bus.id}`,
        bus,
        'bus',
        t('Bus {name} · Reported GPS', { name: bus.name || bus.id }),
      );
    if (userLocation) upsert('you', userLocation, 'you', t('Your location snapshot'));
    for (const [key, entry] of markers)
      if (!wanted.has(key)) {
        entry.animation?.cancel();
        entry.marker.remove();
        markers.delete(key);
      }

    // Remove each bus as its reported GPS expires, even if refresh is failing.
    let expiration: ReturnType<typeof setTimeout> | undefined;
    const expire = () => {
      let next = Infinity;
      for (const [key, entry] of markers) {
        if (!key.startsWith('bus-')) continue;
        if (!validVehicle(entry.point)) {
          entry.animation?.cancel();
          entry.marker.remove();
          markers.delete(key);
        } else
          next = Math.min(
            next,
            Date.parse(entry.point.lastUpdated || '') + GPS_TTL_MS - Date.now(),
          );
      }
      if (Number.isFinite(next)) expiration = setTimeout(expire, Math.max(1, next));
    };
    expire();
    return () => clearTimeout(expiration);
  }, [ready, stops, vehicles, selectedStop, userLocation, route.color, showStops, t]);

  useEffect(() => {
    if (!ready || !state.current) return;
    const container = state.current.map.getContainer();
    for (const [selector, label] of [
      ['.leaflet-control-zoom-in', 'Zoom in'],
      ['.leaflet-control-zoom-out', 'Zoom out'],
    ]) {
      const button = container.querySelector(selector);
      button?.setAttribute('title', t(label));
      button?.setAttribute('aria-label', t(label));
    }
  }, [ready, t]);

  useEffect(() => {
    if (!ready || !state.current) return;
    const { map, overlays } = state.current;
    overlays.clearLayers();
    fitRoute(map, stops, paths);
    const animations: ReturnType<typeof animate>[] = [];
    for (const path of paths) {
      const points = path.coordinates.filter(validPoint).map(coordinates);
      if (points.length > 1) {
        L.polyline(points, { color: '#fff', weight: 9, opacity: 0.95 }).addTo(overlays);
        const line = L.polyline(points, {
          color: route.color,
          weight: 5,
          opacity: 0.9,
          interactive: false,
        }).addTo(overlays);
        const svgPath = line.getElement() as SVGPathElement | undefined;
        if (
          svgPath &&
          !reducedMotion() &&
          !document.hidden &&
          typeof svgPath.getTotalLength === 'function'
        ) {
          const length = svgPath.getTotalLength();
          svgPath.style.strokeDasharray = `${length}`;
          animations.push(
            animate(svgPath, {
              strokeDashoffset: [length, 0],
              duration: 1100,
              ease: 'outCubic',
              onComplete: () => {
                svgPath.style.strokeDasharray = '';
                svgPath.style.strokeDashoffset = '';
              },
            }),
          );
        }
      }
    }
    return () => {
      for (const animation of animations) animation.cancel();
    };
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
        aria-label={t('Interactive LAX shuttle map with boarding stops and reported bus positions')}
      />
      {ready && (
        <>
          <div className="map-display-controls">
            <div className="basemap-switch" role="group" aria-label={t('Map appearance')}>
              <button
                type="button"
                aria-pressed={basemap === 'simple'}
                onClick={() => {
                  setSimpleUnavailable(false);
                  setBasemap('simple');
                }}
              >
                {' '}
                {t('Simple')}{' '}
              </button>
              <button
                type="button"
                aria-pressed={basemap === 'detailed'}
                onClick={() => {
                  setSimpleUnavailable(false);
                  setBasemap('detailed');
                }}
              >
                {' '}
                {t('Street detail')}{' '}
              </button>
            </div>
            <button
              type="button"
              className="map-stops-toggle"
              aria-pressed={showStops}
              onClick={() => setShowStops((show) => !show)}
            >
              {showStops ? t('Hide other stops') : t('Show other stops')}
            </button>
          </div>
          <div className="shuttle-map-legend" aria-label={t('Map legend')}>
            <span>
              <i className="legend-stop" /> {t('Stop')}{' '}
            </span>
            <span>
              <i className="legend-bus" /> {t('Bus')}{' '}
            </span>
            {userLocation && (
              <span>
                <i className="legend-you" /> {t('You')}{' '}
              </span>
            )}
          </div>
        </>
      )}
      {simpleUnavailable && !tileError && (
        <p className="map-tile-warning" role="status">
          {' '}
          {t('Simple map unavailable. Showing street detail.')}{' '}
        </p>
      )}
      {tileError && (
        <p className="map-tile-warning" role="status">
          {' '}
          {t('Map images couldn’t load. Stops and departure times remain available.')}{' '}
        </p>
      )}
    </div>
  );
}

export default memo(FreeMap);

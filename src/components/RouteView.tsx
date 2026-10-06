import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { animate } from 'animejs';
import { LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import { BusFront, MapPin } from 'lucide-react';
import { ARRIVAL_TTL_MS, GPS_TTL_MS, snapshotFresh, validVehicle } from '../domain/arrivals';
import { createRouteProjection, routePathData, validRoutePoint } from '../domain/route-view';
import { config } from '../config';
import { terminalKey } from '../domain/commute';
import { useLanguage } from '../i18n/LanguageProvider';
import type { MapProps, Vehicle } from '../types';

type Position = { x: number; y: number };
function BusMarker({
  bus,
  position,
  reduce,
  label,
  approaching,
}: {
  bus: Vehicle;
  position: Position;
  reduce: boolean;
  label: string;
  approaching: boolean;
}) {
  const element = useRef<SVGGElement>(null);
  const current = useRef(position);
  useEffect(() => {
    const write = () =>
      element.current?.setAttribute(
        'transform',
        `translate(${current.current.x} ${current.current.y})`,
      );
    if (
      reduce ||
      document.hidden ||
      (current.current.x === position.x && current.current.y === position.y)
    ) {
      current.current = { ...position };
      write();
      return;
    }
    // A short transition between reported snapshots, not predicted driving.
    const animation = animate(current.current, {
      x: position.x,
      y: position.y,
      duration: 900,
      ease: 'outCubic',
      onUpdate: write,
    });
    const settle = () => {
      if (document.hidden) {
        animation.cancel();
        current.current = { ...position };
        write();
      }
    };
    document.addEventListener('visibilitychange', settle);
    return () => {
      animation.cancel();
      document.removeEventListener('visibilitychange', settle);
    };
  }, [position.x, position.y, reduce]);
  return (
    <g
      ref={element}
      transform={`translate(${current.current.x} ${current.current.y})`}
      className="route-view-bus"
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      {approaching && !reduce && (
        <m.circle
          key={bus.lastUpdated}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2"
          initial={{ r: 23, opacity: 0.65 }}
          animate={{ r: 34, opacity: 0 }}
          transition={{ duration: 1.2, repeat: 1 }}
        />
      )}
      <circle r="19" />
      <g transform="translate(-11 -11)">
        <BusFront width={22} height={22} />
      </g>
      <text y="32" textAnchor="middle">
        {bus.name || bus.id}
      </text>
    </g>
  );
}
function RouteView(props: MapProps) {
  const {
    route,
    stops,
    paths,
    vehicles,
    selectedStop,
    userLocation,
    onSelectStop,
    focusRequest,
    liveData,
    routeLoading = true,
  } = props;
  const { t } = useLanguage();
  const reduce = useReducedMotion() === true;
  const project = useMemo(() => createRouteProjection(stops, paths), [stops, paths]);
  const [now, setNow] = useState(Date.now());
  // Individual GPS reports expire even if the server cannot refresh.
  useEffect(() => {
    let deadline: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      clearTimeout(deadline);
      const time = Date.now();
      setNow(time);
      const remaining = vehicles
        .filter((bus) => validVehicle(bus, time))
        .map((bus) => Date.parse(bus.lastUpdated) + GPS_TTL_MS - time);
      if (liveData?.arrivalFetchedAt && snapshotFresh(liveData.arrivalFetchedAt, time)) {
        remaining.push(Date.parse(liveData.arrivalFetchedAt) + ARRIVAL_TTL_MS - time);
        for (const prediction of liveData.predictions) {
          if (prediction.due > time) remaining.push(prediction.due - time);
          if (prediction.due - 180_000 > time) remaining.push(prediction.due - 180_000 - time);
        }
      }
      if (remaining.length) deadline = setTimeout(check, Math.max(1, Math.min(...remaining)));
    };
    check();
    document.addEventListener('visibilitychange', check);
    return () => {
      clearTimeout(deadline);
      document.removeEventListener('visibilitychange', check);
    };
  }, [vehicles, liveData]);
  const freshBuses = vehicles.filter((bus) => validVehicle(bus, now));
  const approaching = snapshotFresh(liveData?.arrivalFetchedAt, now)
    ? liveData?.predictions.find(
        (prediction) =>
          !prediction.scheduled &&
          prediction.due > now &&
          prediction.due - now <= 180_000 &&
          freshBuses.some((bus) => bus.id === prediction.vehicleID),
      )
    : undefined;
  const [backgroundError, setBackgroundError] = useState(false);
  useEffect(() => setBackgroundError(false), [project]);
  // The backdrop stays fixed; focus controls highlight markers instead of moving the image.
  const focusYou = focusRequest.mode === 'you' && focusRequest.serial > 0;
  return (
    <LazyMotion features={domAnimation} strict>
      <m.div
        className="map-surface route-view"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="route-view-heading">
          <span>
            <MapPin size={15} />
            {t('Route view')}
          </span>
          <span>{approaching ? t('Bus approaching your stop') : t('Reported GPS')}</span>
        </div>
        {!project ? (
          <div className="route-view-empty" role="status">
            {routeLoading
              ? t('Loading route geometry…')
              : t('Route map is unavailable. Retry boarding stops below.')}
          </div>
        ) : (
          <m.svg
            viewBox="0 0 600 420"
            className="route-view-svg"
            role="group"
            aria-label={t('Shuttle route with reported bus positions')}
          >
            <g className="route-view-backdrop" aria-hidden="true">
              {project.tiles.map((tile) => (
                <image
                  key={tile.key}
                  x={tile.x}
                  y={tile.y}
                  width={tile.size + 0.5}
                  height={tile.size + 0.5}
                  preserveAspectRatio="none"
                  href={config.mapTileUrl
                    .replace('{z}', String(tile.zoom))
                    .replace('{x}', String(tile.column))
                    .replace('{y}', String(tile.row))}
                  onError={() => setBackgroundError(true)}
                />
              ))}
            </g>
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
              {paths.map((path) => (
                <g key={`${route.id}:${path.id}`}>
                  <path
                    d={routePathData(path.coordinates, project)}
                    className="route-view-track"
                    strokeWidth="14"
                  />
                  <m.path
                    d={routePathData(path.coordinates, project)}
                    stroke="var(--route-color)"
                    strokeWidth="6"
                    initial={reduce ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.9, ease: 'easeOut' }}
                  />
                </g>
              ))}
            </g>
            {stops.filter(validRoutePoint).map((stop) => {
              const { x, y } = project(stop);
              const selected = stop.id === selectedStop?.id;
              const terminal = terminalKey(stop.name);
              return (
                <g key={stop.id} transform={`translate(${x} ${y})`}>
                  <g
                    role="button"
                    tabIndex={0}
                    aria-label={stop.name}
                    aria-pressed={selected}
                    className={`route-view-stop ${selected ? 'selected' : ''}`}
                    onClick={() => onSelectStop(stop)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onSelectStop(stop);
                      }
                    }}
                  >
                    <title>{stop.name}</title>
                    <circle r="22" fill="transparent" stroke="none" />
                    <circle r={selected ? 12 : terminal ? 11 : 7} />
                    {selected && <circle r="18" fill="none" strokeWidth="2" />}
                    {terminal && (
                      <text textAnchor="middle" dominantBaseline="central">
                        {terminal}
                      </text>
                    )}
                  </g>
                </g>
              );
            })}
            {userLocation && validRoutePoint(userLocation) && (
              <circle
                cx={project(userLocation).x}
                cy={project(userLocation).y}
                r="8"
                className={`route-view-you ${focusYou ? 'focused' : ''}`}
              >
                <title>{t('Your location snapshot')}</title>
              </circle>
            )}
            {freshBuses.map((bus) => (
              <BusMarker
                key={`${route.id}:${bus.id}`}
                bus={bus}
                position={project(bus)}
                reduce={reduce}
                approaching={approaching?.vehicleID === bus.id}
                label={t('Bus {name} · Reported GPS', { name: bus.name || bus.id })}
              />
            ))}
          </m.svg>
        )}
        <div className="route-view-caption">
          <strong>{selectedStop ? selectedStop.name : t('Choose a boarding stop')}</strong>
          <span>{t('Bus movement updates only with new GPS reports.')}</span>
        </div>
        <div
          className="route-view-attribution"
          dangerouslySetInnerHTML={{ __html: config.mapAttribution }}
        />
        {backgroundError && (
          <p className="route-view-notice" role="status">
            {t('Map background could not load. Route lines and live buses remain available.')}
          </p>
        )}
        {!paths.length && project && (
          <p className="route-view-notice">
            {t('Route lines unavailable. Showing reported stops and buses.')}
          </p>
        )}
      </m.div>
    </LazyMotion>
  );
}
export default memo(RouteView);

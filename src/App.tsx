import { useLanguage } from './i18n/LanguageProvider';
import type { Direction, Stop } from './types';
import Button from './components/ui/Button';
import { motion, useReducedMotion } from 'motion/react';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Briefcase,
  Car,
  ExternalLink,
  LocateFixed,
  MapPin,
  Route,
  Users,
  WifiOff,
} from './components/ui/icons';
import {
  ROUTES,
  boardingStops,
  distanceMeters,
  nearestStop,
  routeForLot,
  savedBoardingStop,
} from './domain/commute';
import { availableArrivals, validVehicle } from './domain/arrivals';
import { useAccount } from './hooks/useAccount';
import { useCommute } from './hooks/useCommute';
import { useLive, useOnline, useRoute, useSnapshotFresh } from './hooks/useShuttle';
import ShuttleMap from './components/ShuttleMap';
import Arrivals from './components/Arrivals';
import { officialTrackerURL } from './components/OfficialTracker';
import OutageNotice from './components/OutageNotice';
import WhatsNew from './components/WhatsNew';
import Avatar from './components/Avatar';
import { useAvatar } from './hooks/useAvatar';
import { usePaletteSync } from './hooks/usePaletteSync';
import { useNickname } from './hooks/useNickname';
import { dayPart } from './domain/nickname';
import { smoothly } from './domain/motion';
import CrowdReports from './components/CrowdReports';
import NextShuttleHero from './components/NextShuttleHero';
import StopSearch from './components/StopSearch';
import StopReports from './components/StopReports';
import { AppUpdates } from './components/InstallApp';
import DirectionsButton from './components/DirectionsButton';
import MapLoading from './components/MapLoading';
import CommuteWelcome from './components/CommuteWelcome';
import TabBar, { type Tab } from './components/TabBar';
import { useSheetDetents } from './hooks/useSheetDetents';
import { useCurrentLocation } from './hooks/useCurrentLocation';
import { haptic } from './domain/haptics';
const SavedCommute = lazy(() => import('./components/SavedCommute'));
const MePage = lazy(() => import('./components/MePage'));
const EMPTY: never[] = [];
// LAX's published guidance for employee shuttles, shown while live times are paused.
const TYPICAL_GAP = '7–15';

export default function App() {
  const { t } = useLanguage();
  const reduceMotion = useReducedMotion() === true;
  const { user, ready, recovering, authReturn } = useAccount();
  const { profile, hasSaved, remember, save, saveState } = useCommute();
  const [tab, setTab] = useState<Tab>('map');
  const [accountOpen, setAccountOpen] = useState(false);
  const [welcome, setWelcome] = useState(false);
  const initialNavigation = useRef(false);
  useEffect(() => {
    if (!ready || initialNavigation.current) return;
    initialNavigation.current = true;
    if (recovering || authReturn) return;
    if (!hasSaved) {
      let seen = false;
      try {
        seen = localStorage.getItem('laxcommute:welcome-seen') === '1';
      } catch {
        /* Show the introduction if storage is unavailable. */
      }
      setWelcome(!seen);
    }
  }, [ready, hasSaved, recovering, authReturn]);
  function skipWelcome() {
    setWelcome(false);
    try {
      localStorage.setItem('laxcommute:welcome-seen', '1');
    } catch {
      /* Dismiss still works. */
    }
  }
  const [lot, setLot] = useState(profile.lot);
  const [direction, setDirection] = useState<Direction>(() => {
    try {
      return localStorage.getItem('laxcommute:last-direction') === 'parking' ? 'parking' : 'work';
    } catch {
      return 'work';
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem('laxcommute:last-direction', direction);
    } catch {
      /* Navigation still works without storage. */
    }
  }, [direction]);

  const [override, setOverride] = useState<{
    routeID: number;
    direction: Direction;
    id: number;
    source: string;
  } | null>(null);
  const sheet = useSheetDetents();
  const {
    location: userLocation,
    error: locationError,
    setError: setLocationError,
    locating,
    locate: findLocation,
  } = useCurrentLocation();
  const [focusRequest, setFocusRequest] = useState({ mode: 'route', serial: 0 });
  const [outageOpen, setOutageOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const online = useOnline();
  const { avatar } = useAvatar();
  usePaletteSync();
  const { nickname } = useNickname();
  const greeting = nickname
    ? t(
        {
          morning: 'Good morning, {name}',
          afternoon: 'Good afternoon, {name}',
          evening: 'Good evening, {name}',
        }[dayPart(new Date().getHours())],
        { name: nickname },
      )
    : t('Departures');
  const route = routeForLot(lot);
  const routeQuery = useRoute(route.id);
  const stops = routeQuery.data?.stops || EMPTY;
  const paths = routeQuery.data?.paths || EMPTY;
  const mapStops = useMemo(
    () => stops.filter((stop) => !/drop[ -]?off|layover/i.test(stop.name)),
    [stops],
  );
  const options = useMemo(() => boardingStops(stops, direction, lot), [stops, direction, lot]);
  const usual = useMemo(
    () => savedBoardingStop(profile, stops, direction, lot),
    [profile, stops, direction, lot],
  );
  const todayID =
    override?.routeID === route.id && override?.direction === direction ? override.id : null;
  const selectedStop = useMemo(
    () => stops.find((s) => s.id === todayID) || usual,
    [todayID, stops, usual],
  );
  const live = useLive(route.id, selectedStop?.id, tab === 'map' && Boolean(routeQuery.data));
  const vehicleFresh = useSnapshotFresh(live.data?.vehicleFetchedAt);
  const arrivalFresh = useSnapshotFresh(live.data?.arrivalFetchedAt);
  // The feed answered but has nothing current to show (or did not answer at all).
  const liveDown = Boolean(live.isError || live.data?.sourceUnavailable) && !arrivalFresh;
  // Treat live times as paused until fresh data actually returns.
  const [feedOutage, setFeedOutage] = useState(true);
  useEffect(() => {
    if (liveDown) setFeedOutage(true);
    else if (arrivalFresh) setFeedOutage(false);
  }, [liveDown, arrivalFresh]);
  // Re-render periodically so the departure card counts down between feed refreshes.
  const [, setClock] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) setClock((tick) => tick + 1);
    }, 15_000);
    return () => clearInterval(timer);
  }, []);
  const nextArrival =
    arrivalFresh &&
    !live.data?.cached &&
    !live.isError &&
    !live.data?.arrivalSourceUnavailable &&
    selectedStop
      ? availableArrivals(live.data?.predictions || EMPTY, Date.now())[0]
      : undefined;
  const nextArriving = Boolean(
    nextArrival && !nextArrival.scheduled && nextArrival.due - Date.now() <= 30_000,
  );
  const nextMinutes = nextArrival
    ? Math.max(0, Math.ceil((nextArrival.due - Date.now()) / 60000))
    : null;
  const vehicles = useMemo(
    () =>
      vehicleFresh && !live.isError && !live.data?.cached
        ? (live.data?.vehicles || EMPTY).filter((v) => validVehicle(v))
        : EMPTY,
    [live.data?.vehicles, vehicleFresh, live.isError],
  );
  useEffect(() => {
    setLot(profile.lot);
    setOverride(null);
  }, [user?.id, profile.lot]);
  useEffect(() => {
    if (recovering || authReturn) {
      setTab('me');
      setAccountOpen(true);
    }
  }, [recovering, authReturn]);
  function changeTab(next: Tab) {
    if (next !== tab) haptic('tap');
    initialNavigation.current = true;
    smoothly(() => {
      setWelcome(false);
      setTab(next);
      if (next !== 'me') setAccountOpen(false);
    });
  }
  function changeDirection(next: Direction) {
    if (next !== direction) haptic('select');
    smoothly(() => {
      setDirection(next);
      setOverride(null);
    });
  }
  function chooseRoute(next: string) {
    if (next !== lot) haptic('select');
    smoothly(() => {
      setLot(next);
      setOverride(null);
      sheet.reveal();
    });
  }
  const chooseStop = useCallback(
    (stop: Stop) => {
      const nextDirection = /terminal/i.test(stop.name) ? 'parking' : 'work';
      smoothly(() => {
        setDirection(nextDirection);
        setOverride({ id: stop.id, direction: nextDirection, routeID: route.id, source: 'manual' });
        sheet.reveal();
      });
    },
    [route.id],
  );
  function focus(mode: string) {
    setFocusRequest((current) => ({ mode, serial: current.serial + 1 }));
  }
  function locate() {
    findLocation((fix) => {
      const nearest = nearestStop(options, fix);
      if (!nearest || distanceMeters(fix, nearest) > 3_000) {
        setLocationError('You’re outside the boarding area. Choose a stop manually.');
      } else {
        setOverride({ id: nearest.id, direction, routeID: route.id, source: 'nearby' });
      }
      focus('you');
    });
  }

  const explore = tab === 'map';

  return (
    <div
      className={`app is-${tab}`}
      style={{
        // Routes take the theme's accent so every color on screen belongs to one palette.
        '--route-color': 'var(--ios-tint)',
        '--route-solid-color': 'var(--ios-tint)',
      }}
    >
      <h1 className="sr-only">LAXCommute</h1>
      <div className="map-stage" aria-hidden={!explore || undefined} inert={!explore || undefined}>
        <Suspense fallback={<MapLoading />}>
          <ShuttleMap
            routeLoading={routeQuery.isPending && routeQuery.fetchStatus === 'fetching'}
            route={route}
            liveData={live.data}
            stops={mapStops}
            paths={paths}
            vehicles={vehicles}
            selectedStop={selectedStop}
            userLocation={userLocation}
            onSelectStop={chooseStop}
            focusRequest={focusRequest}
          />
        </Suspense>
        {explore && (
          <>
            <div className="map-top">
              <StopSearch stops={options} selected={selectedStop} onChoose={chooseStop} />
              <Button
                className="avatar-button"
                aria-label={user ? t('Open your account') : t('Open Me')}
                onClick={() => changeTab('me')}
              >
                <Avatar id={avatar} size={36} />
              </Button>
            </div>
            <div className="map-tools" role="group" aria-label={t('Map tools')}>
              <Button
                onClick={() => focus('route')}
                aria-label={t('Whole route')}
                title={t('Whole route')}
              >
                <Route size={20} />
              </Button>
              <Button
                onClick={() => focus('stop')}
                disabled={!selectedStop}
                aria-label={t('My stop')}
                title={t('My stop')}
              >
                <MapPin size={20} />
              </Button>
              <Button
                onClick={locate}
                disabled={locating || options.length === 0}
                aria-label={locating ? t('Locating…') : t('Near me')}
                title={t('Near me')}
              >
                <LocateFixed size={20} />
              </Button>
            </div>
          </>
        )}
      </div>

      <aside
        ref={sheet.sheetRef}
        className="panel"
        data-detent={sheet.detent}
        aria-label={explore ? t('Departures') : undefined}
      >
        <header className="panel-head">
          <span className="brand" lang="en">
            <img src="/icons/commute-v9-192.png" alt="" width={32} height={32} />
            <strong>LAXCommute</strong>
          </span>
        </header>
        {explore && (
          <Button
            className="sheet-grip"
            aria-label={sheet.expanded ? t('Collapse departures') : t('Expand departures')}
            {...sheet.gripProps}
          >
            <i aria-hidden="true" />
          </Button>
        )}
        <motion.div
          key={tab}
          className="panel-body"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
        >
          {!online && (
            <p className="notice is-warning offline-banner" role="status">
              <WifiOff size={16} aria-hidden="true" />
              {t(
                'You’re offline. Saved settings are available; live data will resume when you reconnect.',
              )}
            </p>
          )}
          {explore ? (
            <>
              <div className="sheet-heading">
                <h2>{greeting}</h2>
                <span>{direction === 'work' ? t('Heading to work') : t('Heading home')}</span>
              </div>
              <div className="direction-switch" role="group" aria-label={t('Travel direction')}>
                <Button aria-pressed={direction === 'work'} onClick={() => changeDirection('work')}>
                  <Briefcase size={17} aria-hidden="true" />
                  {t('To work')}
                </Button>
                <Button
                  aria-pressed={direction === 'parking'}
                  onClick={() => changeDirection('parking')}
                >
                  <Car size={17} aria-hidden="true" />
                  {t('To parking')}
                </Button>
              </div>
              <div
                className="lot-selector"
                role="group"
                aria-label={t('Which shuttle do you want?')}
              >
                {ROUTES.map((r) => {
                  const isSelected = r.lot === lot;
                  return (
                    <Button
                      key={r.id}
                      aria-pressed={isSelected}
                      aria-label={t('{lot} Lot shuttle', { lot: r.lot })}
                      className={`lot-selector-tab ${isSelected ? 'is-active' : ''}`}
                      onClick={() => chooseRoute(r.lot)}
                    >
                      <span className="lot-selector-badge" aria-hidden="true">
                        {r.short}
                      </span>
                      <span className="lot-selector-meta">
                        <strong className="lot-selector-name">
                          {r.lot} {t('Lot')}
                        </strong>
                        <small className="lot-selector-coverage">{t(r.coverage)}</small>
                      </span>
                    </Button>
                  );
                })}
              </div>
              {saveState && hasSaved && (
                <p className="notice is-success" role="status">
                  {t(saveState)}
                </p>
              )}
              <NextShuttleHero
                routeShort={route.short}
                lotLabel={`${lot} ${t('Lot')}`}
                stopName={selectedStop?.name}
                destination={
                  direction === 'parking' ? t('{lot} employee parking', { lot }) : profile.terminal
                }
                minutes={nextMinutes}
                arriving={nextArriving}
                scheduled={Boolean(nextArrival?.scheduled)}
                liveDown={online && feedOutage}
                typical={TYPICAL_GAP}
                onExplain={() => setOutageOpen(true)}
              />
              <div className="action-tiles">
                <a
                  className="action-tile"
                  href={officialTrackerURL(route.id, selectedStop?.id)}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink size={20} aria-hidden="true" />
                  {t('Live times')}
                </a>
                {selectedStop && <DirectionsButton stop={selectedStop} />}
                <Button
                  className="action-tile"
                  aria-haspopup="dialog"
                  onClick={() => setReportOpen(true)}
                >
                  <Users size={20} aria-hidden="true" />
                  {t('Report')}
                </Button>
              </div>
              {!feedOutage && (
                <Arrivals
                  data={live.data}
                  error={live.error}
                  loading={live.isPending && live.fetchStatus === 'fetching'}
                  fetching={live.isFetching}
                  stop={selectedStop}
                  direction={direction}
                  profile={profile}
                  userLocation={userLocation}
                  routeID={route.id}
                  routeLabel={`${route.lot} ${t('Lot')}`}
                  onRefresh={() => {
                    live.refetch();
                    if (routeQuery.isError) routeQuery.refetch();
                  }}
                />
              )}

              {direction === 'work' &&
                lot !== 'South' &&
                !/\bsouth\s+lot\b/i.test(selectedStop?.name || '') && (
                  <p className="group-note">
                    {t('Waiting at South Lot? Choose your stop below to see {lot} buses.', { lot })}
                  </p>
                )}
              <h3 className="group-title">{t('At this stop')}</h3>
              <div className="group">
                <label className="field stop-field">
                  <span className="row-icon" aria-hidden="true">
                    <MapPin size={18} />
                  </span>
                  <span className="sr-only">{t('Where are you boarding?')}</span>
                  <select
                    aria-label={t('Where are you boarding?')}
                    className="select"
                    value={selectedStop?.id || 0}
                    onChange={(e) => {
                      const id = Number(e.target.value);
                      smoothly(() =>
                        setOverride({ id, routeID: route.id, direction, source: 'manual' }),
                      );
                    }}
                  >
                    <option value={0} disabled>
                      {routeQuery.isPending ? t('Loading stops…') : t('Choose a boarding stop')}
                    </option>
                    {options.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="field stop-choices">
                  <Button
                    className="chip"
                    aria-pressed={!todayID}
                    onClick={() => setOverride(null)}
                  >
                    {t('Usual stop')}
                  </Button>
                  <Button
                    className="chip"
                    onClick={locate}
                    disabled={locating || options.length === 0}
                  >
                    {locating ? t('Finding you…') : t('Use my location')}
                  </Button>
                </div>
                <StopReports
                  key={`${route.id}:${selectedStop?.id || 0}`}
                  routeId={route.id}
                  stop={selectedStop}
                  open={reportOpen}
                  onOpenChange={setReportOpen}
                />
              </div>
              {todayID && (
                <p className="group-note">
                  {override?.source === 'nearby' ? t('Nearby stop') : t('Today’s stop')}{' '}
                  {t('· your saved commute stays the same.')}
                </p>
              )}
              {locationError && (
                <p className="notice is-warning" role="status">
                  {t(locationError)}
                </p>
              )}
              {routeQuery.isError && (
                <p className="notice is-warning" role="status">
                  {t('Boarding stops are unavailable.')}{' '}
                  <Button className="text-button" onClick={() => routeQuery.refetch()}>
                    {t('Retry')}
                  </Button>
                </p>
              )}
              {routeQuery.data?.warning && (
                <p className="group-note" role="status">
                  {t(routeQuery.data.warning)}
                </p>
              )}

              {vehicles.length > 0 && <CrowdReports routeId={route.id} vehicles={vehicles} />}
            </>
          ) : (
            <Suspense fallback={<p className="hint">{t('Opening your settings…')}</p>}>
              {tab === 'trip' ? (
                <SavedCommute
                  key={`${user?.id || 'guest'}-${profile.lot}-${profile.terminal}`}
                  profile={profile}
                  remember={remember}
                  save={async (next, rememberHere) => {
                    await save(next, rememberHere);
                    setLot(next.lot);
                    setDirection('work');
                    setOverride(null);
                    skipWelcome();
                    changeTab('map');
                  }}
                  saveState={saveState}
                  onGoHome={() => {
                    changeDirection('parking');
                    changeTab('map');
                  }}
                  onAccount={() => {
                    changeTab('me');
                    setAccountOpen(true);
                  }}
                />
              ) : (
                <MePage
                  profile={profile}
                  accountOpen={accountOpen}
                  onAccountOpen={setAccountOpen}
                  onEditTrip={() => changeTab('trip')}
                  onGuest={() => changeTab('map')}
                />
              )}
            </Suspense>
          )}
        </motion.div>
      </aside>
      <TabBar tab={tab} onChange={changeTab} />
      <WhatsNew />
      <AppUpdates />
      <OutageNotice
        open={outageOpen}
        onClose={() => setOutageOpen(false)}
        routeID={route.id}
        stopID={selectedStop?.id}
      />
      <CommuteWelcome
        open={welcome && !hasSaved && !recovering && !authReturn}
        onSetup={() => changeTab('trip')}
        onSkip={skipWelcome}
      />
    </div>
  );
}

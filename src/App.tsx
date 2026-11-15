import { useLanguage } from './i18n/LanguageProvider';
import type { Direction, Point, Stop } from './types';
import Button from './components/ui/Button';
import { motion, useReducedMotion } from 'motion/react';
import {
  lazy,
  Suspense,
  useCallback,
  useRef,
  useEffect,
  useMemo,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import {
  Bookmark,
  ExternalLink,
  Home,
  LocateFixed,
  Map,
  MapPin,
  Navigation,
  Route,
  UserRound,
  WifiOff,
  ChevronRight,
  Users,
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
// The provider stays lazy without a second request for its tiny selector.
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
import InstallApp from './components/InstallApp';
import ShareApp from './components/ShareApp';
import DirectionsButton from './components/DirectionsButton';
import AppMenu from './components/AppMenu';
import MapLoading from './components/MapLoading';
import CommuteWelcome from './components/CommuteWelcome';
import { haptic } from './domain/haptics';
const AccountPanel = lazy(() => import('./components/AccountPanel'));
const SavedCommute = lazy(() => import('./components/SavedCommute'));
const EMPTY: never[] = [];
const TABS = [
  { id: 'map', label: 'Explore', Icon: Map },
  { id: 'home', label: 'Go home', Icon: Home },
  { id: 'saved', label: 'My commute', Icon: Bookmark },
  { id: 'account', label: 'Account', Icon: UserRound },
];

export default function App() {
  const { t, language } = useLanguage();
  const reduceMotion = useReducedMotion() === true;
  const [compactMap, setCompactMap] = useState(
    () => window.matchMedia('(max-width: 760px)').matches,
  );
  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)');
    const update = () => setCompactMap(query.matches);
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);
  const { user, ready, recovering, authReturn } = useAccount();
  const { profile, hasSaved, remember, save, saveState } = useCommute();
  const [tab, setTab] = useState('map');
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
  const tripCardRef = useRef<HTMLElement>(null);
  const stopSelectRef = useRef<HTMLSelectElement>(null);
  const [sheetExpanded, setSheetExpanded] = useState(true);
  const sheetGesture = useRef<{ pointer: number; startY: number; lastY: number } | null>(null);
  const ignoreSheetClick = useRef(false);
  function startSheetDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!compactMap || event.button !== 0) return;
    ignoreSheetClick.current = false;
    sheetGesture.current = {
      pointer: event.pointerId,
      startY: event.clientY,
      lastY: event.clientY,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }
  function moveSheetDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    const gesture = sheetGesture.current;
    const panel = tripCardRef.current;
    if (!gesture || gesture.pointer !== event.pointerId || !panel) return;
    gesture.lastY = event.clientY;
    const distance = gesture.lastY - gesture.startY;
    if (Math.abs(distance) < 8 && !panel.classList.contains('sheet-dragging')) return;
    // Move only the grip. Keep the panel in normal document flow so it never
    // obstructs the map or the bottom navigation during a swipe.
    panel.classList.add('sheet-dragging');
    panel.style.setProperty('--sheet-grip-pull', `${Math.max(-12, Math.min(12, distance / 7))}px`);
  }
  function finishSheetDrag(event: ReactPointerEvent<HTMLButtonElement>, cancelled = false) {
    const gesture = sheetGesture.current;
    if (!gesture || gesture.pointer !== event.pointerId) return;
    sheetGesture.current = null;
    const panel = tripCardRef.current;
    panel?.classList.remove('sheet-dragging');
    panel?.style.removeProperty('--sheet-grip-pull');
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const distance = gesture.lastY - gesture.startY;
    ignoreSheetClick.current = Math.abs(distance) >= 8;
    if (!cancelled && Math.abs(distance) > 40) setSheetExpanded(distance < 0);
  }
  const [override, setOverride] = useState<{
    routeID: number;
    direction: Direction;
    id: number;
    source: string;
  } | null>(null);
  const [userLocation, setUserLocation] = useState<
    (Point & { accuracy?: number; at?: number }) | null
  >(null);
  const [locationError, setLocationError] = useState('');
  const [locating, setLocating] = useState(false);
  const [focusRequest, setFocusRequest] = useState({ mode: 'route', serial: 0 });
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
    : '';
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
  const live = useLive(
    route.id,
    selectedStop?.id,
    (tab === 'map' || tab === 'home') && Boolean(routeQuery.data),
  );
  const vehicleFresh = useSnapshotFresh(live.data?.vehicleFetchedAt);
  const arrivalFresh = useSnapshotFresh(live.data?.arrivalFetchedAt);
  // The feed answered but has nothing current to show (or did not answer at all).
  const liveDown = Boolean(live.isError || live.data?.sourceUnavailable) && !arrivalFresh;
  // Keep the announcement up on every tab until fresh live data actually returns.
  const [feedOutage, setFeedOutage] = useState(true);
  useEffect(() => {
    if (liveDown) setFeedOutage(true);
    else if (arrivalFresh) setFeedOutage(false);
  }, [liveDown, arrivalFresh]);
  // Re-render periodically so the map card's minutes count down between feed refreshes.
  const [, setPeekClock] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) setPeekClock((tick) => tick + 1);
    }, 15_000);
    return () => clearInterval(timer);
  }, []);
  const nextMapArrival =
    arrivalFresh &&
    !live.data?.cached &&
    !live.isError &&
    !live.data?.arrivalSourceUnavailable &&
    selectedStop
      ? availableArrivals(live.data?.predictions || EMPTY, Date.now())[0]
      : undefined;
  const nextArriving = Boolean(
    nextMapArrival && !nextMapArrival.scheduled && nextMapArrival.due - Date.now() <= 30_000,
  );
  const nextMinutes = nextMapArrival
    ? Math.max(0, Math.ceil((nextMapArrival.due - Date.now()) / 60000))
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
    if (recovering || authReturn) setTab('account');
  }, [recovering, authReturn]);
  function changeTab(next: string) {
    if (next !== tab) {
      haptic('tap');
      // A new page should open at its top, not at the previous page's scroll position.
      const sameLayout = (next === 'map' || next === 'home') && (tab === 'map' || tab === 'home');
      if (!sameLayout) window.scrollTo({ top: 0, behavior: 'instant' });
    }
    initialNavigation.current = true;
    smoothly(() => {
      setWelcome(false);
      setTab(next);
      setSheetExpanded(true);
      if (next === 'home') {
        setDirection('parking');
        setLot(profile.lot);
        setOverride(null);
      }
    });
  }
  function changeDirection(next: Direction) {
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
    });
  }
  const chooseStop = useCallback(
    (stop: Stop) => {
      const nextDirection = /terminal/i.test(stop.name) ? 'parking' : 'work';
      smoothly(() => {
        setDirection(nextDirection);
        setOverride({ id: stop.id, direction: nextDirection, routeID: route.id, source: 'manual' });
      });
    },
    [route.id],
  );
  function focus(mode: string) {
    setFocusRequest((current) => ({ mode, serial: current.serial + 1 }));
  }
  function locate() {
    setLocationError('');
    if (!navigator.geolocation) {
      setLocationError(
        'This browser does not support location. Choose your boarding stop manually.',
      );
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          lat: position.coords.latitude,
          lon: position.coords.longitude,
          accuracy: position.coords.accuracy,
          at: Date.now(),
        };
        setUserLocation(location);
        setLocating(false);
        const nearest = nearestStop(options, location);
        if (!nearest || distanceMeters(location, nearest) > 3_000) {
          setLocationError('You’re outside the boarding area. Choose a stop manually.');
          focus('you');
          return;
        }
        setOverride({ id: nearest.id, direction, routeID: route.id, source: 'nearby' });
        focus('you');
      },
      (error) => {
        setLocating(false);
        setLocationError(
          error.code === 1
            ? 'Location access was declined. You can choose any boarding stop manually.'
            : 'Your location could not be found. Try again or choose a stop manually.',
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }
  const showTrip = tab === 'map' || tab === 'home';
  return (
    <div
      className={`app${showTrip ? ' is-map' : ''}`}
      style={{
        // Routes take the theme's accent so every color on screen belongs to one palette.
        '--route-color': 'var(--ios-tint)',
        '--route-solid-color': 'var(--ios-tint)',
      }}
    >
      <header className="navbar app-header">
        <a
          className="brand"
          lang="en"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            changeTab('map');
          }}
          aria-label={t('LAXCommute home')}
        >
          <img src="/icons/commute-v8-192.png" alt="" width={43} height={43} />
          <div>
            <strong>
              LAX<span>Commute</span>
            </strong>
            <small lang={language}>{t('YOUR AIRPORT. YOUR COMMUTE.')}</small>
          </div>
        </a>
        <div className="header-actions">
          <ShareApp />
          <InstallApp />
          <AppMenu />
          <Button
            className="profile-button"
            onClick={() => changeTab('account')}
            aria-label={user ? t('Open your account') : t('Sign in')}
          >
            <Avatar id={avatar} size={34} />
            <span>{user ? t('My account') : t('Sign in')}</span>
          </Button>
        </div>
      </header>
      {!online && (
        <div className="offline-banner" role="status">
          <WifiOff size={16} />{' '}
          {t(
            'You’re offline. Saved settings are available; live data will resume when you reconnect.',
          )}{' '}
        </div>
      )}
      <WhatsNew />
      {online && feedOutage && !showTrip && (
        <OutageNotice routeID={route.id} stopID={selectedStop?.id} />
      )}
      <motion.main
        // Map and Go home share one layout; keeping its key stable avoids remounting the map.
        key={showTrip ? 'trip' : tab}
        className={showTrip ? 'trip-layout' : 'settings-layout'}
        initial={reduceMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
      >
        {showTrip ? (
          <>
            <section className="map-column">
              <div className="map-topbar sr-only">
                <h1>{tab === 'home' ? t('Let’s get you home.') : t('Find your next shuttle.')}</h1>
              </div>
              <div id="shuttle-map-panel">
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
                <div className="map-controls" role="group" aria-label={t('Map tools')}>
                  <Button
                    onClick={() => focus('route')}
                    aria-label={t('Whole route')}
                    title={t('Whole route')}
                  >
                    <Route size={18} />
                  </Button>
                  <Button
                    onClick={() => focus('stop')}
                    disabled={!selectedStop}
                    aria-label={t('My stop')}
                    title={t('My stop')}
                  >
                    <MapPin size={18} />
                  </Button>
                  <Button
                    onClick={locate}
                    disabled={locating || options.length === 0}
                    aria-label={locating ? t('Locating…') : t('Near me')}
                    title={t('Near me')}
                  >
                    <LocateFixed size={18} />
                  </Button>
                </div>
              </div>
            </section>
            <aside
              ref={tripCardRef}
              className={`card bg-base-100 trip-card ${sheetExpanded ? 'sheet-expanded' : 'sheet-peek'}`}
            >
              <Button
                className="sheet-handle"
                aria-label={t(
                  sheetExpanded ? 'Collapse commute details' : 'Expand commute details',
                )}
                aria-expanded={sheetExpanded}
                aria-controls="trip-sheet-content"
                onPointerDown={startSheetDrag}
                onPointerMove={moveSheetDrag}
                onPointerUp={(event) => finishSheetDrag(event)}
                onPointerCancel={(event) => finishSheetDrag(event, true)}
                onClick={(event) => {
                  if (event.detail !== 0 && ignoreSheetClick.current) {
                    ignoreSheetClick.current = false;
                    return;
                  }
                  setSheetExpanded((expanded) => !expanded);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    setSheetExpanded(true);
                  } else if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    setSheetExpanded(false);
                  }
                }}
              >
                <span className="sheet-grip" aria-hidden="true" />
              </Button>
              <div id="trip-sheet-content" className="trip-sheet-content">
                {saveState && hasSaved && (
                  <p className="alert alert-soft alert-success notice" role="status">
                    {t(saveState)}
                  </p>
                )}
                <StopSearch stops={options} selected={selectedStop} onChoose={chooseStop} />
                <div className="sheet-heading">
                  <h2>{greeting || t('Departures')}</h2>
                </div>
                <NextShuttleHero
                  routeShort={route.short}
                  lotLabel={`${lot} ${t('Lot')}`}
                  stopName={selectedStop?.name}
                  destination={
                    direction === 'parking'
                      ? t('{lot} employee parking', { lot })
                      : profile.terminal
                  }
                  minutes={nextMinutes}
                  arriving={nextArriving}
                  scheduled={Boolean(nextMapArrival?.scheduled)}
                  liveDown={liveDown}
                />
                <div className="lot-rows" role="group" aria-label={t('Which shuttle do you want?')}>
                  {ROUTES.filter((r) => r.id !== route.id).map((r) => (
                    <Button
                      key={r.id}
                      className="lot-row"
                      aria-label={t('{lot} Lot shuttle', { lot: r.lot })}
                      onClick={() => chooseRoute(r.lot)}
                    >
                      <span className="lot-badge" aria-hidden="true">
                        {r.short}
                      </span>
                      <span className="lot-row-copy">
                        <strong>
                          {r.lot} {t('Lot')}
                        </strong>
                        <small>{t(r.coverage)}</small>
                      </span>
                      <ChevronRight size={16} aria-hidden="true" />
                    </Button>
                  ))}
                </div>
                <div className="sheet-actions">
                  <a
                    className="sheet-action"
                    href={officialTrackerURL(route.id, selectedStop?.id)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <ExternalLink size={18} aria-hidden="true" />
                    {t('Live times')}
                  </a>
                  {selectedStop && <DirectionsButton stop={selectedStop} compact />}
                  <Button
                    className="sheet-action"
                    onClick={() =>
                      document.querySelector('.stop-reports')?.scrollIntoView({
                        behavior: reduceMotion ? 'auto' : 'smooth',
                        block: 'start',
                      })
                    }
                  >
                    <Users size={18} aria-hidden="true" />
                    {t('Report')}
                  </Button>
                </div>
                {online && feedOutage && (
                  <OutageNotice routeID={route.id} stopID={selectedStop?.id} />
                )}
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
                <h3 className="sheet-section-title">{t('Your trip')}</h3>
                <div className="trip-list">
                  <div className="trip-row">
                    <span className="trip-key">{t('Going')}</span>
                    <div
                      className="direction-switch"
                      role="group"
                      aria-label={t('Travel direction')}
                    >
                      <Button
                        className={direction === 'work' ? 'active' : ''}
                        aria-pressed={direction === 'work'}
                        onClick={() => changeDirection('work')}
                      >
                        {t('To work')}
                      </Button>
                      <Button
                        className={direction === 'parking' ? 'active' : ''}
                        aria-pressed={direction === 'parking'}
                        onClick={() => changeDirection('parking')}
                      >
                        {t('To parking')}
                      </Button>
                    </div>
                  </div>
                  <label className="trip-row">
                    <span className="trip-key">{t('Boarding')}</span>
                    <select
                      aria-label={t('Where are you boarding?')}
                      ref={stopSelectRef}
                      className="select trip-select"
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
                </div>
                {direction === 'work' && lot !== 'South' && (
                  <p className="sheet-note">
                    {t('Waiting at South Lot? Choose your stop below to see {lot} buses.', { lot })}
                  </p>
                )}
                <div className="stop-actions">
                  <Button className={!todayID ? 'active' : ''} onClick={() => setOverride(null)}>
                    <Bookmark size={14} /> {t('Usual stop')}{' '}
                  </Button>
                  <Button onClick={locate} disabled={locating || options.length === 0}>
                    <Navigation size={14} />
                    {locating ? t('Finding you…') : t('Use my location')}
                  </Button>
                </div>
                {todayID && (
                  <p className="today-note">
                    {override?.source === 'nearby' ? t('Nearby stop') : t('Today’s stop')}{' '}
                    {t('· your saved commute stays the same.')}{' '}
                  </p>
                )}
                {locationError && (
                  <p className="alert alert-soft alert-warning notice" role="status">
                    {t(locationError)}
                  </p>
                )}
                {routeQuery.isError && (
                  <p className="alert alert-soft alert-warning notice" role="status">
                    {' '}
                    {t('Boarding stops are unavailable.')}{' '}
                    <Button onClick={() => routeQuery.refetch()}>{t('Retry')}</Button>
                  </p>
                )}
                {routeQuery.data?.warning && (
                  <p className="crowd-note" role="status">
                    {t(routeQuery.data.warning)}
                  </p>
                )}
                <StopReports
                  key={`${route.id}:${selectedStop?.id || 0}`}
                  routeId={route.id}
                  stop={selectedStop}
                />
                {vehicles.length > 0 && <CrowdReports routeId={route.id} vehicles={vehicles} />}
              </div>
            </aside>
          </>
        ) : (
          <Suspense
            fallback={
              <section className="card bg-base-100 page-card">
                {t('Opening your settings…')}
              </section>
            }
          >
            {tab === 'saved' ? (
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
                onGoHome={() => changeTab('home')}
                onAccount={() => changeTab('account')}
              />
            ) : (
              <AccountPanel
                profile={profile}
                onSaved={() => changeTab('saved')}
                onGuest={() => changeTab('map')}
              />
            )}
          </Suspense>
        )}
      </motion.main>
      <CommuteWelcome
        open={welcome && !hasSaved && !recovering && !authReturn}
        onSetup={() => changeTab('saved')}
        onSkip={skipWelcome}
      />
      <nav className="bottom-nav" aria-label={t('Main navigation')}>
        {TABS.map(({ id, label, Icon }) => (
          <Button
            key={id}
            className={tab === id ? 'active' : ''}
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => changeTab(id)}
          >
            {tab === id && (
              <motion.span
                layoutId="nav-pill"
                className="nav-pill"
                aria-hidden="true"
                transition={
                  reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 38 }
                }
              />
            )}
            <motion.span
              key={tab === id ? 'on' : 'off'}
              className="nav-icon"
              initial={reduceMotion || tab !== id ? false : { scale: 0.7, y: 2 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 600, damping: 18 }}
            >
              <Icon size={21} strokeWidth={tab === id ? 2.3 : 1.8} />
            </motion.span>
            <span>{t(label)}</span>
          </Button>
        ))}
      </nav>
    </div>
  );
}

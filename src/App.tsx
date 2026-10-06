import { useLanguage } from './i18n/LanguageProvider';
import type { Direction, Point, Stop } from './types';
import Button from './components/ui/Button';
import { lazy, Suspense, useCallback, useRef, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownUp,
  ArrowRight,
  Bookmark,
  BusFront,
  ExternalLink,
  Home,
  LocateFixed,
  Map,
  MapPin,
  Navigation,
  Route,
  UserRound,
  WifiOff,
  ChevronDown,
} from 'lucide-react';
import {
  ROUTES,
  boardingStops,
  distanceMeters,
  nearestStop,
  routeForLot,
  savedBoardingStop,
} from './domain/commute';
import { validVehicle } from './domain/arrivals';
import { useAccount } from './hooks/useAccount';
import { useCommute } from './hooks/useCommute';
import { useLive, useOnline, useRoute, useSnapshotFresh } from './hooks/useShuttle';
// The provider stays lazy without a second request for its tiny selector.
import ShuttleMap from './components/ShuttleMap';
import Arrivals from './components/Arrivals';
import InstallApp from './components/InstallApp';
import DirectionsButton from './components/DirectionsButton';
import AppMenu from './components/AppMenu';
import CommuteWelcome from './components/CommuteWelcome';
import { useTheme } from './theme/ThemeProvider';
const darkRouteColor = (color: string) =>
  color === '#3262ab' ? '#88b7ff' : color === '#b76328' ? '#e4bb82' : '#58dce3';
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
  const { appearance } = useTheme();
  const { t, language } = useLanguage();
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
  const [direction, setDirection] = useState<Direction>('work');
  const [override, setOverride] = useState<{
    routeID: number;
    direction: Direction;
    id: number;
    source: string;
  } | null>(null);
  const [userLocation, setUserLocation] = useState<Point | null>(null);
  const [locationError, setLocationError] = useState('');
  const [locating, setLocating] = useState(false);
  const [focusRequest, setFocusRequest] = useState({ mode: 'route', serial: 0 });
  const online = useOnline();
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
    (tab === 'map' || tab === 'home') && !routeQuery.isPending && !routeQuery.isError,
  );
  const vehicleFresh = useSnapshotFresh(live.data?.vehicleFetchedAt);
  const vehicles = useMemo(
    () =>
      vehicleFresh && !live.isError
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
    initialNavigation.current = true;
    setWelcome(false);
    setTab(next);
    if (next === 'home') {
      setDirection('parking');
      setLot(profile.lot);
      setOverride(null);
    }
  }
  function changeDirection(next: Direction) {
    setDirection(next);
    setOverride(null);
  }
  function chooseRoute(next: string) {
    setLot(next);
    setOverride(null);
  }
  const chooseStop = useCallback(
    (stop: Stop) => {
      const nextDirection = /terminal/i.test(stop.name) ? 'parking' : 'work';
      setDirection(nextDirection);
      setOverride({ id: stop.id, direction: nextDirection, routeID: route.id, source: 'manual' });
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
      className="app"
      style={{
        '--route-color': appearance === 'dark' ? darkRouteColor(route.color) : route.color,
        '--route-solid-color': route.color,
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
          <img src="/icons/commute-v2-192.png" alt="" width={43} height={43} />
          <div>
            <strong>
              LAX<span>Commute</span>
            </strong>
            <small lang={language}>{t('YOUR AIRPORT. YOUR COMMUTE.')}</small>
          </div>
        </a>
        <div className="header-actions">
          <InstallApp />
          <AppMenu />
          <Button
            className="profile-button"
            onClick={() => changeTab('account')}
            aria-label={user ? t('Open your account') : t('Sign in')}
          >
            <UserRound size={20} />
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
      <main className={showTrip ? 'trip-layout' : 'settings-layout'}>
        {showTrip ? (
          <>
            <section className="map-column">
              <div className="map-topbar">
                <div>
                  <span className="eyebrow">{t('LAX EMPLOYEE SHUTTLES')}</span>
                  <h1>
                    {tab === 'home' ? t('Let’s get you home.') : t('Find your next shuttle.')}
                  </h1>
                </div>
                <div className="map-route-label">
                  <span className="route-square">{route.short}</span>
                  <div>
                    <strong>
                      {lot} {t('Lot')}
                    </strong>
                    <span>
                      {vehicles.length
                        ? t('{count} buses on the map', { count: vehicles.length })
                        : t(
                            live.isError || routeQuery.isError
                              ? 'Bus data unavailable'
                              : live.isFetching || routeQuery.isPending
                                ? 'Checking bus positions'
                                : 'No fresh bus positions',
                          )}
                    </span>
                  </div>
                </div>
              </div>
              <Suspense
                fallback={<div className="map-surface map-loading">{t('Opening map…')}</div>}
              >
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
              <div className="map-controls">
                <Button onClick={() => focus('route')}>
                  <Route size={16} /> {t('Whole route')}{' '}
                </Button>
                <Button onClick={() => focus('stop')} disabled={!selectedStop}>
                  <MapPin size={16} /> {t('My stop')}{' '}
                </Button>
                <Button onClick={locate} disabled={locating || options.length === 0}>
                  <LocateFixed size={16} />
                  {locating ? t('Locating…') : t('Near me')}
                </Button>
              </div>
              {routeQuery.data?.warning && (
                <p className="map-warning">{t(routeQuery.data.warning)}</p>
              )}
              <div className="map-footer">
                <span>
                  <span className="dot" />
                  {online ? t('Live data from the LAX tracker') : t('Waiting for connection')}
                </span>
                <a
                  href="https://shuttles.flylax.com/employeeparking"
                  target="_blank"
                  rel="noreferrer"
                >
                  {' '}
                  {t('LAX tracker')} <ExternalLink size={13} />
                </a>
              </div>
            </section>
            <aside className="card bg-base-100 trip-card">
              {saveState && hasSaved && (
                <p className="alert alert-soft alert-success notice" role="status">
                  {t(saveState)}
                </p>
              )}
              <div className="trip-intro">
                <span className="eyebrow">
                  {direction === 'parking' ? t('YOUR RIDE BACK') : t('TO WORK')}
                </span>
                <h2>
                  {direction === 'parking'
                    ? t('Back to your parking lot.')
                    : t('Where are you waiting?')}
                </h2>
                <p>
                  {direction === 'parking'
                    ? t('{terminal} is your usual terminal. Choose any other stop for today.', {
                        terminal: profile.terminal,
                      })
                    : t('Choose your shuttle and the stop you’re waiting at.')}
                </p>
              </div>
              <div
                className="tabs tabs-box segmented direction-switch"
                role="group"
                aria-label={t('Travel direction')}
              >
                <Button
                  className={direction === 'work' ? 'tab tab-active active' : 'tab'}
                  aria-pressed={direction === 'work'}
                  onClick={() => changeDirection('work')}
                >
                  <BusFront size={16} /> {t('To work')}{' '}
                </Button>
                <Button
                  className={direction === 'parking' ? 'tab tab-active active' : 'tab'}
                  aria-pressed={direction === 'parking'}
                  onClick={() => changeDirection('parking')}
                >
                  <Home size={16} /> {t('To parking')}{' '}
                </Button>
              </div>
              <div className="field route-field">
                <span>{t('Which shuttle do you want?')}</span>
                <div className="route-options">
                  {ROUTES.map((r) => (
                    <Button
                      key={r.id}
                      className={r.lot === lot ? 'selected' : ''}
                      onClick={() => chooseRoute(r.lot)}
                      style={{
                        '--option-color': appearance === 'dark' ? darkRouteColor(r.color) : r.color,
                      }}
                    >
                      <span>{r.short}</span>
                      {r.lot}
                    </Button>
                  ))}
                </div>
              </div>
              {direction === 'work' && lot !== 'South' && (
                <p className="small muted">
                  {t('Waiting at South Lot? Choose your stop below to see {lot} buses.', { lot })}
                </p>
              )}
              <div className="trip-destination">
                <div className="journey-line">
                  <span />
                  <i />
                  <span />
                </div>
                <div>
                  <span>{t('FROM')}</span>
                  <strong>{selectedStop?.name || t('Choose your boarding stop')}</strong>
                  <span>{t('TO')}</span>
                  <strong>
                    {direction === 'parking'
                      ? t('{lot} employee parking', { lot })
                      : profile.terminal}
                  </strong>
                </div>
                <ArrowDownUp size={17} />
              </div>
              <label className="field">
                {' '}
                {t('Where are you boarding?')}{' '}
                <select
                  className="select w-full"
                  value={selectedStop?.id || 0}
                  onChange={(e) =>
                    setOverride({
                      id: Number(e.target.value),
                      routeID: route.id,
                      direction,
                      source: 'manual',
                    })
                  }
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
              <Arrivals
                data={live.data}
                error={live.error}
                loading={live.isPending && live.fetchStatus === 'fetching'}
                fetching={live.isFetching}
                stop={selectedStop}
                direction={direction}
                profile={profile}
                onRefresh={() => {
                  live.refetch();
                  if (routeQuery.isError) routeQuery.refetch();
                }}
              />
              <details className="collapse advanced">
                <summary className="collapse-title">
                  <span>{t('Other bus options')}</span>
                  <ChevronDown size={17} />
                </summary>
                <div className="collapse-content advanced-content">
                  {ROUTES.filter((r) => r.id !== route.id).map((r) => (
                    <Button key={r.id} onClick={() => chooseRoute(r.lot)}>
                      <span className="other-route-icon" style={{ background: r.color }}>
                        {r.short}
                      </span>
                      <span>
                        <strong>{t('{lot} Lot shuttle', { lot: r.lot })}</strong>
                        <small>{t(r.coverage)}</small>
                      </span>
                      <ArrowRight size={17} />
                    </Button>
                  ))}
                  <p>
                    {t('Select another route to check its actual boarding stops and departures.')}
                  </p>
                </div>
              </details>
              {selectedStop && <DirectionsButton stop={selectedStop} />}
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
      </main>
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
            <Icon size={21} strokeWidth={tab === id ? 2.3 : 1.8} />
            <span>{t(label)}</span>
          </Button>
        ))}
      </nav>
    </div>
  );
}

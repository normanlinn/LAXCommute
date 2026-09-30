import Button from './components/ui/Button';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
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
  mapsLink,
  nearestStop,
  routeForLot,
  savedBoardingStop,
} from './domain/commute';
import { validVehicle } from './domain/arrivals';
import { useAccount } from './hooks/useAccount';
import { useCommute } from './hooks/useCommute';
import { useLive, useOnline, useRoute, useSnapshotFresh } from './hooks/useShuttle';
import Arrivals from './components/Arrivals';
import InstallApp from './components/InstallApp';
const AppleMap = lazy(() => import('./components/AppleMap'));
const AccountPanel = lazy(() => import('./components/AccountPanel'));
const SavedCommute = lazy(() => import('./components/SavedCommute'));
const EMPTY = Object.freeze([]);
const TABS = [
  { id: 'map', label: 'Explore', Icon: Map },
  { id: 'home', label: 'Go home', Icon: Home },
  { id: 'saved', label: 'My commute', Icon: Bookmark },
  { id: 'account', label: 'Account', Icon: UserRound },
];

export default function App() {
  const { user, recovering } = useAccount();
  const { profile, save, saveState } = useCommute();
  const [tab, setTab] = useState('map');
  const [lot, setLot] = useState(profile.lot);
  const [direction, setDirection] = useState('work');
  const [override, setOverride] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [locating, setLocating] = useState(false);
  const [focusRequest, setFocusRequest] = useState({ mode: 'route', serial: 0 });
  const online = useOnline();
  const route = routeForLot(lot);
  const routeQuery = useRoute(route.id);
  const stops = routeQuery.data?.stops || EMPTY;
  const paths = routeQuery.data?.paths || EMPTY;
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
  const live = useLive(route.id, selectedStop?.id, tab === 'map' || tab === 'home');
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
    if (recovering) setTab('account');
  }, [recovering]);
  function changeTab(next) {
    setTab(next);
    if (next === 'home') {
      setDirection('parking');
      setLot(profile.lot);
      setOverride(null);
    }
  }
  function changeDirection(next) {
    setDirection(next);
    setOverride(null);
  }
  function chooseRoute(next) {
    setLot(next);
    setOverride(null);
  }
  const chooseStop = useCallback(
    (stop) => {
      const nextDirection = /terminal/i.test(stop.name) ? 'parking' : 'work';
      setDirection(nextDirection);
      setOverride({ id: stop.id, direction: nextDirection, routeID: route.id, source: 'manual' });
    },
    [route.id],
  );
  function focus(mode) {
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
    <div className="app" style={{ '--route-color': route.color }}>
      <header className="navbar app-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            changeTab('map');
          }}
          aria-label="LAXCommute home"
        >
          <img src="/icons/icon-192.png" alt="" width={43} height={43} />
          <div>
            <strong>
              LAX<span>Commute</span>
            </strong>
            <small>YOUR AIRPORT. YOUR COMMUTE.</small>
          </div>
        </a>
        <div className="header-actions">
          <InstallApp />
          <Button
            className="profile-button"
            onClick={() => changeTab('account')}
            aria-label={user ? 'Open your account' : 'Sign in'}
          >
            <UserRound size={20} />
            <span>{user ? 'My account' : 'Sign in'}</span>
          </Button>
        </div>
      </header>
      {!online && (
        <div className="offline-banner" role="status">
          <WifiOff size={16} />
          You’re offline. Saved settings are available; live data will resume when you reconnect.
        </div>
      )}
      <main className={showTrip ? 'trip-layout' : 'settings-layout'}>
        {showTrip ? (
          <>
            <section className="map-column">
              <div className="map-topbar">
                <div>
                  <span className="eyebrow">LAX EMPLOYEE SHUTTLES</span>
                  <h1>
                    {tab === 'home' ? 'Let’s get you home.' : 'A better way to catch your shuttle.'}
                  </h1>
                </div>
                <div className="map-route-label">
                  <span className="route-square">{route.short}</span>
                  <div>
                    <strong>{lot} Lot</strong>
                    <span>
                      {vehicles.length
                        ? `${vehicles.length} buses reporting GPS`
                        : 'Checking bus positions'}
                    </span>
                  </div>
                </div>
              </div>
              <Suspense fallback={<div className="map-surface map-loading">Opening map…</div>}>
                <AppleMap
                  route={route}
                  stops={stops}
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
                  <Route size={16} />
                  Whole route
                </Button>
                <Button onClick={() => focus('stop')} disabled={!selectedStop}>
                  <MapPin size={16} />
                  My stop
                </Button>
                <Button onClick={locate} disabled={locating || options.length === 0}>
                  <LocateFixed size={16} />
                  {locating ? 'Locating…' : 'Near me'}
                </Button>
              </div>
              {routeQuery.data?.warning && <p className="map-warning">{routeQuery.data.warning}</p>}
              <div className="map-footer">
                <span>
                  <span className="dot" />
                  {online ? 'Actual feed data · no simulated buses' : 'Waiting for connection'}
                </span>
                <a
                  href="https://shuttles.flylax.com/employeeparking"
                  target="_blank"
                  rel="noreferrer"
                >
                  LAX tracker <ExternalLink size={13} />
                </a>
              </div>
            </section>
            <aside className="card bg-base-100 trip-card">
              <div className="trip-intro">
                <span className="eyebrow">
                  {direction === 'parking' ? 'YOUR RIDE BACK' : 'START YOUR SHIFT'}
                </span>
                <h2>
                  {direction === 'parking' ? 'Back to your parking lot.' : 'Where are we headed?'}
                </h2>
                <p>
                  {direction === 'parking'
                    ? `${profile.terminal} is your usual terminal. Choose any other stop for today.`
                    : 'Pick your lot and boarding stop. We’ll check the next departures.'}
                </p>
              </div>
              <div
                className="tabs tabs-box segmented direction-switch"
                aria-label="Travel direction"
              >
                <Button
                  className={direction === 'work' ? 'tab tab-active active' : 'tab'}
                  onClick={() => changeDirection('work')}
                >
                  <BusFront size={16} />
                  To work
                </Button>
                <Button
                  className={direction === 'parking' ? 'tab tab-active active' : 'tab'}
                  onClick={() => changeDirection('parking')}
                >
                  <Home size={16} />
                  To parking
                </Button>
              </div>
              <div className="field route-field">
                <span>Shuttle route</span>
                <div className="route-options">
                  {ROUTES.map((r) => (
                    <Button
                      key={r.id}
                      className={r.lot === lot ? 'selected' : ''}
                      onClick={() => chooseRoute(r.lot)}
                      style={{ '--option-color': r.color }}
                    >
                      <span>{r.short}</span>
                      {r.lot}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="trip-destination">
                <div className="journey-line">
                  <span />
                  <i />
                  <span />
                </div>
                <div>
                  <span>FROM</span>
                  <strong>{selectedStop?.name || 'Choose your boarding stop'}</strong>
                  <span>TO</span>
                  <strong>
                    {direction === 'parking' ? `${lot} employee parking` : profile.terminal}
                  </strong>
                </div>
                <ArrowDownUp size={17} />
              </div>
              <label className="field">
                Boarding stop for this trip
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
                    {routeQuery.isPending ? 'Loading stops…' : 'Choose a boarding stop'}
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
                  <Bookmark size={14} />
                  Usual stop
                </Button>
                <Button onClick={locate} disabled={locating || options.length === 0}>
                  <Navigation size={14} />
                  {locating ? 'Finding you…' : 'Use my location'}
                </Button>
              </div>
              {todayID && (
                <p className="today-note">
                  {override.source === 'nearby' ? 'Nearby stop' : 'Today’s stop'} · your saved
                  commute stays the same.
                </p>
              )}
              {locationError && (
                <p className="alert alert-soft alert-warning notice" role="status">
                  {locationError}
                </p>
              )}
              {routeQuery.isError && (
                <p className="alert alert-soft alert-warning notice" role="status">
                  Boarding stops are unavailable.{' '}
                  <Button onClick={() => routeQuery.refetch()}>Retry</Button>
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
                  <span>Other bus options</span>
                  <ChevronDown size={17} />
                </summary>
                <div className="collapse-content advanced-content">
                  {ROUTES.filter((r) => r.id !== route.id).map((r) => (
                    <Button key={r.id} onClick={() => chooseRoute(r.lot)}>
                      <span className="other-route-icon" style={{ background: r.color }}>
                        {r.short}
                      </span>
                      <span>
                        <strong>{r.lot} Lot shuttle</strong>
                        <small>{r.coverage}</small>
                      </span>
                      <ArrowRight size={17} />
                    </Button>
                  ))}
                  <p>Select another route to check its actual boarding stops and departures.</p>
                </div>
              </details>
              {selectedStop && (
                <a
                  className="directions-link"
                  href={mapsLink(selectedStop)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open boarding stop in Apple Maps <ExternalLink size={14} />
                </a>
              )}
            </aside>
          </>
        ) : (
          <Suspense
            fallback={
              <section className="card bg-base-100 page-card">Opening your settings…</section>
            }
          >
            {tab === 'saved' ? (
              <SavedCommute
                key={`${user?.id || 'guest'}-${profile.lot}-${profile.terminal}`}
                profile={profile}
                save={save}
                saveState={saveState}
                onGoHome={() => changeTab('home')}
                onAccount={() => changeTab('account')}
              />
            ) : (
              <AccountPanel profile={profile} onSaved={() => changeTab('saved')} />
            )}
          </Suspense>
        )}
      </main>
      <nav className="bottom-nav" aria-label="Main navigation">
        {TABS.map(({ id, label, Icon }) => (
          <Button
            key={id}
            className={tab === id ? 'active' : ''}
            aria-current={tab === id ? 'page' : undefined}
            onClick={() => changeTab(id)}
          >
            <Icon size={21} strokeWidth={tab === id ? 2.3 : 1.8} />
            <span>{label}</span>
          </Button>
        ))}
      </nav>
    </div>
  );
}

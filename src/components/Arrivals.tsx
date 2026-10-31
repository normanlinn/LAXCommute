import { useLanguage } from '../i18n/LanguageProvider';
import Button from './ui/Button';
import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  Bell,
  BellRing,
  BusFront,
  Clock3,
  RefreshCw,
  Footprints,
  X,
} from 'lucide-react';
import { canSetAlert, useBusAlert } from '../hooks/useBusAlert';
import {
  availableArrivals,
  nextLoopBusesAtStop,
  departureAdvice,
  snapshotFresh,
} from '../domain/arrivals';

// The approach bar fills over the final ten minutes of a live prediction.
const APPROACH_WINDOW_MS = 10 * 60_000;

/** Re-keys on change so each new value rolls in instead of snapping. */
function RollingNumber({ value }: { value: string | number }) {
  return (
    <span className="rolling-number">
      <span key={value}>{value}</span>
    </span>
  );
}

export default function Arrivals({
  data,
  error,
  loading,
  fetching,
  stop,
  direction,
  profile,
  onRefresh,
}: {
  data?: import('../types').LiveData;
  error: Error | null;
  loading: boolean;
  fetching: boolean;
  stop?: import('../types').Stop;
  direction: import('../types').Direction;
  profile: import('../types').Commute;
  onRefresh: () => void;
}) {
  const { t, language } = useLanguage();
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    // One visibility-aware clock drives ETAs, the arriving label and freshness.
    // Avoid two competing timers and stop polling while the app is backgrounded.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      clearTimeout(timer);
      const current = Date.now();
      setNow(current);
      if (document.hidden || !data?.arrivalFetchedAt) return;
      const live =
        !error &&
        !data?.cached &&
        !data?.arrivalSourceUnavailable &&
        snapshotFresh(data?.arrivalFetchedAt, current);
      // Tick every second while a live bus is close so the approach bar moves smoothly.
      const soon = (data?.predictions || []).some(
        (p) => !p.scheduled && p.due > current - 45_000 && p.due - current < APPROACH_WINDOW_MS,
      );
      timer = setTimeout(tick, live ? (soon ? 1_000 : 5_000) : 60_000);
    };
    tick();
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [
    data?.arrivalFetchedAt,
    data?.cached,
    data?.arrivalSourceUnavailable,
    data?.predictions,
    error,
  ]);
  const fresh =
    !data?.cached && !data?.arrivalSourceUnavailable && snapshotFresh(data?.arrivalFetchedAt, now);
  const lastKnown = Boolean(data?.cached || data?.arrivalSourceUnavailable || error);
  const reportedPredictions = (data?.predictions || []).filter(
    (arrival) =>
      Number.isFinite(arrival.due) && arrival.due >= Date.parse(data?.arrivalFetchedAt || ''),
  );
  const arrivals = fresh && !error ? availableArrivals(data?.predictions || [], now) : [];
  const nearbyWithNextPass =
    fresh && !error && !data?.vehicleSourceUnavailable && snapshotFresh(data?.vehicleFetchedAt, now)
      ? nextLoopBusesAtStop(data?.vehicles || [], stop, arrivals, now).slice(0, 2)
      : [];
  const advice =
    fresh && direction === 'parking'
      ? departureAdvice(arrivals, profile.walkingMinutes, profile.bufferMinutes, now)
      : null;
  const busAlert = useBusAlert({
    stopID: stop?.id,
    predictions: arrivals,
    message: ({ busName }) => ({
      title: t('Your shuttle is almost here'),
      body: t('Bus {name} is about 2 min from {stop}.', {
        name: busName || '',
        stop: stop?.name || '',
      }),
    }),
  });
  const warnings = data?.warnings || [];
  const ageSeconds = data?.arrivalFetchedAt
    ? Math.max(0, Math.floor((now - Date.parse(data?.arrivalFetchedAt)) / 1_000))
    : 0;
  return (
    <section className="arrivals" aria-label={t('Upcoming departures')}>
      <div className="section-heading">
        <div>
          <span className="eyebrow">{t('NEXT DEPARTURES')}</span>
          <h3>{stop ? t('Your next shuttle') : t('Choose a boarding stop')}</h3>
        </div>
        <Button
          type="button"
          className="icon-button"
          title={t('Refresh live bus data')}
          aria-label={t('Refresh live bus data')}
          onClick={onRefresh}
          disabled={fetching}
        >
          <RefreshCw size={18} className={fetching ? 'spin' : ''} />
        </Button>
      </div>
      {stop && (
        <p className="boarding-caption">
          <BusFront size={15} /> {stop.name}
        </p>
      )}
      {nearbyWithNextPass.map(({ vehicle, nextPrediction }) => (
        <p className="nearby-gps-notice" role="status" key={vehicle.id}>
          <BusFront size={17} aria-hidden="true" />
          <span>
            {t(
              'Bus {name} is near this stop (GPS). Its {minutes}-min prediction may be for the next loop. Boarding is not confirmed.',
              {
                name: vehicle.name || vehicle.id,
                minutes: Math.ceil((nextPrediction.due - now) / 60_000),
              },
            )}
          </span>
        </p>
      ))}
      {busAlert.fired && (
        <div className="bus-alert-banner" role="alert">
          <BellRing size={20} aria-hidden="true" />
          <div>
            <strong>{t('Your shuttle is almost here')}</strong>
            <span>
              {t('Bus {name} is about 2 min from {stop}.', {
                name: busAlert.fired.busName,
                stop: stop?.name || '',
              })}
            </span>
          </div>
          <Button
            type="button"
            className="icon-button"
            aria-label={t('Dismiss')}
            onClick={busAlert.dismiss}
          >
            <X size={17} />
          </Button>
        </div>
      )}
      {(error || data?.sourceUnavailable) && (
        <div className="alert alert-soft alert-warning notice" role="status">
          {t('Shuttle source unavailable. Try again or check the official LAX tracker.')}{' '}
          <a href="https://shuttles.flylax.com/employeeparking" target="_blank" rel="noreferrer">
            {t('LAX tracker')}
          </a>{' '}
          <Button type="button" onClick={onRefresh}>
            {' '}
            {t('Try again')}{' '}
          </Button>
        </div>
      )}
      {!error && stop && warnings.some((w) => w.includes('Arrival')) && (
        <p className="alert alert-soft alert-warning notice">
          {' '}
          {t('Arrival times are unavailable. Updates continue automatically.')}{' '}
        </p>
      )}
      {loading && (
        <div className="arrival-loading" role="status">
          <div className="arrival-skeleton-row" aria-hidden="true">
            <div className="skeleton skeleton-icon" />
            <div className="skeleton-copy">
              <div className="skeleton skeleton-label" />
              <div className="skeleton skeleton-hint" />
            </div>
            <div className="skeleton skeleton-time" />
          </div>
          <div className="arrival-skeleton-row" aria-hidden="true">
            <div className="skeleton skeleton-icon" />
            <div className="skeleton-copy">
              <div className="skeleton skeleton-label" />
              <div className="skeleton skeleton-hint" />
            </div>
            <div className="skeleton skeleton-time" />
          </div>
          <span className="sr-only">{t('Checking the shuttle feed…')}</span>
        </div>
      )}
      {lastKnown && stop && reportedPredictions.length > 0 && (
        <p className="notice last-known-notice" role="status">
          {t('Last known times · not current arrivals. Check the LAX tracker before leaving.')}
        </p>
      )}
      {!loading &&
        !error &&
        !data?.arrivalSourceUnavailable &&
        stop &&
        arrivals.length === 0 &&
        (!lastKnown || reportedPredictions.length === 0) && (
          <div className="empty-arrivals">
            <Clock3 size={24} />
            <p>
              {!data
                ? t('Waiting for live updates.')
                : data.cached
                  ? t('Saved data only. Reconnect to check the next shuttle.')
                  : !fresh && data.arrivalFetchedAt
                    ? t('These times have expired. Checking for a fresh update.')
                    : t('No upcoming departures reported at this stop.')}
            </p>
            <span>{t('We’ll keep checking while the app is open.')}</span>
          </div>
        )}
      {(lastKnown ? reportedPredictions : arrivals).slice(0, 4).map((arrival, index) => {
        const reportedAt = lastKnown ? Date.parse(data?.arrivalFetchedAt || '') : now;
        const minutes = Math.max(0, Math.ceil((arrival.due - reportedAt) / 60_000));
        const isLive = !lastKnown && !arrival.scheduled;
        const arriving = isLive && arrival.due - now <= 30_000;
        const approach =
          isLive && index === 0
            ? Math.min(1, Math.max(0, 1 - (arrival.due - now) / APPROACH_WINDOW_MS))
            : 0;
        const alertOn = busAlert.alert?.vehicleID === arrival.vehicleID && isLive;
        const showBell = alertOn || (isLive && canSetAlert(arrival, now));
        return (
          <div
            key={arrival.id}
            className={`arrival-row ${index === 0 ? 'arrival-next' : ''}${arriving ? ' is-arriving' : ''}`}
          >
            <div className="bus-symbol">
              <BusFront size={22} />
            </div>
            <div className="arrival-description">
              <strong>{index === 0 ? t('Next shuttle') : t('Following shuttle')}</strong>
              <div className="arrival-meta">
                <span
                  className={`arrival-badge ${lastKnown || arrival.scheduled ? 'is-scheduled' : 'is-live'}`}
                >
                  {!arrival.scheduled && !lastKnown && <i aria-hidden="true" />}
                  {lastKnown ? t('Last reported') : arrival.scheduled ? t('Scheduled') : t('Live')}
                </span>
                <span className="arrival-bus-name">
                  {arrival.busName ? t('Bus {name}', { name: arrival.busName }) : ''}
                </span>
              </div>
            </div>
            {showBell && (
              <Button
                type="button"
                className={`icon-button bus-alert-toggle${alertOn ? ' is-on' : ''}`}
                aria-pressed={alertOn}
                title={alertOn ? t('Cancel alert') : t('Alert me 2 min before')}
                aria-label={
                  alertOn
                    ? t('Cancel alert for bus {name}', { name: arrival.busName })
                    : t('Alert me 2 min before bus {name} arrives', { name: arrival.busName })
                }
                onClick={() => void busAlert.toggle(arrival)}
              >
                {alertOn ? <BellRing size={18} /> : <Bell size={18} />}
              </Button>
            )}
            <div className={`arrival-time${arriving ? ' is-arriving' : ''}`}>
              {arriving ? (
                <strong>{t('Arriving')}</strong>
              ) : (
                <>
                  <strong>
                    <RollingNumber value={minutes < 1 ? '<1' : minutes} />
                  </strong>
                  <span>{lastKnown ? t('min at last update') : t('min')}</span>
                </>
              )}
            </div>
            {isLive && index === 0 && (
              <div className="approach-track" aria-hidden="true">
                <i style={{ transform: `scaleX(${approach})` }} />
              </div>
            )}
          </div>
        );
      })}
      {advice && (
        <div className="leave-card">
          <Footprints size={21} />
          <div>
            <strong>
              {advice.leaveAt <= now
                ? t('Time to head downstairs')
                : t('Leave in {minutes} min', {
                    minutes: Math.ceil((advice.leaveAt - now) / 60_000),
                  })}
            </strong>
            <span>
              {t('{walk} min walk + {buffer} min buffer · based on a live prediction', {
                walk: profile.walkingMinutes,
                buffer: profile.bufferMinutes,
              })}
            </span>
          </div>
          <ArrowUpRight size={18} />
        </div>
      )}
      {data?.arrivalFetchedAt && (
        <p
          className={`updated freshness-${fresh ? (ageSeconds < 60 ? 'fresh' : 'aging') : 'stale'}`}
        >
          {' '}
          {ageSeconds < 60 && fresh
            ? t('Updated {seconds}s ago', { seconds: ageSeconds })
            : t('Last updated {minutes} min ago', { minutes: Math.floor(ageSeconds / 60) })}{' '}
          ·{' '}
          {new Date(data.arrivalFetchedAt).toLocaleTimeString(
            language === 'my' ? 'my-MM-u-nu-latn' : language === 'es' ? 'es-US' : 'en-US',
            {
              hour: 'numeric',
              minute: '2-digit',
            },
          )}{' '}
          · {fresh ? t('Auto updates on') : t('Awaiting fresh data')}
        </p>
      )}
    </section>
  );
}

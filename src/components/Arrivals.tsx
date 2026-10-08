import { useLanguage } from '../i18n/LanguageProvider';
import Button from './ui/Button';
import { useEffect, useState } from 'react';
import { ArrowUpRight, BusFront, Clock3, RefreshCw, Footprints } from 'lucide-react';
import { availableArrivals, departureAdvice, snapshotFresh } from '../domain/arrivals';

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
    // Keep the countdown within this small component, away from the map.
    let timer: ReturnType<typeof setInterval> | undefined;
    const update = () => {
      const current = Date.now();
      setNow(current);
      if (!snapshotFresh(data?.arrivalFetchedAt, current)) clearInterval(timer);
    };
    const start = () => {
      clearInterval(timer);
      update();
      if (
        !document.hidden &&
        !error &&
        !data?.cached &&
        !data?.arrivalSourceUnavailable &&
        snapshotFresh(data?.arrivalFetchedAt)
      )
        timer = setInterval(update, 1_000);
    };
    start();
    document.addEventListener('visibilitychange', start);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', start);
    };
  }, [data?.arrivalFetchedAt, data?.cached, data?.arrivalSourceUnavailable, error]);
  useEffect(() => {
    if (!data?.arrivalFetchedAt) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const update = () => {
      clearInterval(timer);
      setNow(Date.now());
      if (!document.hidden) timer = setInterval(() => setNow(Date.now()), 60_000);
    };
    update();
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', update);
    };
  }, [data?.arrivalFetchedAt]);
  const fresh =
    !data?.cached && !data?.arrivalSourceUnavailable && snapshotFresh(data?.arrivalFetchedAt, now);
  const lastKnown = Boolean(data?.cached || data?.arrivalSourceUnavailable || error);
  const reportedPredictions = (data?.predictions || []).filter(
    (arrival) =>
      Number.isFinite(arrival.due) && arrival.due >= Date.parse(data?.arrivalFetchedAt || ''),
  );
  const arrivals = fresh && !error ? availableArrivals(data?.predictions || [], now) : [];
  const advice =
    fresh && direction === 'parking'
      ? departureAdvice(arrivals, profile.walkingMinutes, profile.bufferMinutes, now)
      : null;
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
        return (
          <div key={arrival.id} className={`arrival-row ${index === 0 ? 'arrival-next' : ''}`}>
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
            <div className="arrival-time">
              <strong>{minutes < 1 ? '<1' : minutes}</strong>
              <span>{lastKnown ? t('min at last update') : t('min')}</span>
            </div>
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
            language === 'my' ? 'my-MM-u-nu-latn' : 'en-US',
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

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
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    // Keep the countdown within this small component, away from the map.
    let timer: ReturnType<typeof setInterval> | undefined;
    const update = () => setNow(Date.now());
    const start = () => {
      clearInterval(timer);
      update();
      if (!document.hidden) timer = setInterval(update, 1_000);
    };
    start();
    document.addEventListener('visibilitychange', start);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', start);
    };
  }, []);
  const fresh = snapshotFresh(data?.arrivalFetchedAt, now);
  const arrivals = fresh && !error ? availableArrivals(data?.predictions || [], now) : [];
  const advice =
    fresh && direction === 'parking'
      ? departureAdvice(arrivals, profile.walkingMinutes, profile.bufferMinutes, now)
      : null;
  const warnings = data?.warnings || [];
  return (
    <section className="arrivals" aria-label="Upcoming departures">
      <div className="section-heading">
        <div>
          <span className="eyebrow">NEXT DEPARTURES</span>
          <h3>{stop ? 'Your next shuttle' : 'Choose a boarding stop'}</h3>
        </div>
        <Button
          type="button"
          className="icon-button"
          title="Refresh live bus data"
          aria-label="Refresh live bus data"
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
      {error && (
        <div className="alert alert-soft alert-warning notice" role="status">
          {error.message}{' '}
          <Button type="button" onClick={onRefresh}>
            Try again
          </Button>
        </div>
      )}
      {!error && stop && warnings.some((w) => w.includes('Arrival')) && (
        <p className="alert alert-soft alert-warning notice">
          Arrival times are unavailable. Updates continue automatically.
        </p>
      )}
      {loading && (
        <div className="arrival-loading" role="status">
          <div className="skeleton" />
          <span>Checking the shuttle feed…</span>
        </div>
      )}
      {!loading && !error && stop && arrivals.length === 0 && (
        <div className="empty-arrivals">
          <Clock3 size={24} />
          <p>
            {!data
              ? 'Waiting for live updates.'
              : !fresh && data.arrivalFetchedAt
                ? 'These times have expired. Checking for a fresh update.'
                : 'No upcoming departures reported at this stop.'}
          </p>
          <span>We’ll keep checking while the app is open.</span>
        </div>
      )}
      {arrivals.slice(0, 4).map((arrival, index) => {
        const minutes = Math.max(0, Math.ceil((arrival.due - now) / 60_000));
        return (
          <div key={arrival.id} className={`arrival-row ${index === 0 ? 'arrival-next' : ''}`}>
            <div className="bus-symbol">
              <BusFront size={22} />
            </div>
            <div className="arrival-description">
              <strong>{index === 0 ? 'Next shuttle' : 'Following shuttle'}</strong>
              <span>
                {arrival.busName ? `Bus ${arrival.busName} · ` : ''}
                {arrival.scheduled ? 'Scheduled time' : 'Live prediction'}
              </span>
            </div>
            <div className="arrival-time">
              <strong>{minutes < 1 ? '<1' : minutes}</strong>
              <span>min</span>
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
                ? 'Time to head downstairs'
                : `Leave in ${Math.ceil((advice.leaveAt - now) / 60_000)} min`}
            </strong>
            <span>
              {profile.walkingMinutes} min walk + {profile.bufferMinutes} min buffer · based on a
              live prediction
            </span>
          </div>
          <ArrowUpRight size={18} />
        </div>
      )}
      {data?.arrivalFetchedAt && (
        <p className="updated">
          Updated{' '}
          {new Date(data.arrivalFetchedAt).toLocaleTimeString([], {
            hour: 'numeric',
            minute: '2-digit',
          })}{' '}
          · {fresh ? 'Auto updates on' : 'Awaiting fresh data'}
        </p>
      )}
    </section>
  );
}

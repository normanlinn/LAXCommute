import { useEffect, useState } from 'react';
import {
  Users,
  RefreshCw,
  BusFront,
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  LoaderCircle,
  MapPin,
  Send,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../i18n/LanguageProvider';
import { useOnline } from '../hooks/useShuttle';
import { getStopReports, sendStopReport, type CrowdLevel } from '../services/community';
import { recentStopReports, type StopActivity } from '../domain/stop-reports';
import { ROUTES } from '../domain/commute';
import type { Stop } from '../types';
import Button from './ui/Button';

const levels = {
  empty: 'Empty',
  seats: 'Seats available',
  standing: 'Standing room',
  full: 'Full',
};
export default function StopReports({ routeId, stop }: { routeId: number; stop?: Stop }) {
  const { t, language } = useLanguage();
  const online = useOnline();
  const [now, setNow] = useState(Date.now());
  const [pending, setPending] = useState<StopActivity | null>(null);
  const [submitted, setSubmitted] = useState<StopActivity | null>(null);
  const [notice, setNotice] = useState('');
  const [level, setLevel] = useState<CrowdLevel>('seats');
  const [cooldown, setCooldown] = useState(0);
  const route = ROUTES.find((item) => item.id === routeId);
  const lot = t(route?.lot || 'South');
  const busy = pending !== null;
  const actionLabel = (activity: StopActivity) =>
    t(
      {
        arrived: '{lot} shuttle arrived',
        departed: '{lot} shuttle departed',
        crowding: '{lot} shuttle crowd report',
      }[activity],
      { lot },
    );
  const reports = useQuery({
    queryKey: ['community-stop', routeId, stop?.id],
    queryFn: () => getStopReports(routeId, stop!.id),
    enabled: Boolean(stop) && online,
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: false,
  });
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(timer);
  }, []);
  const recent = recentStopReports(reports.data || [], now);
  async function send(activity: StopActivity) {
    if (!stop || busy || !online || Date.now() < cooldown) return;
    setPending(activity);
    setSubmitted(null);
    setNotice('');
    try {
      await sendStopReport(routeId, stop.id, activity, activity === 'crowding' ? level : undefined);
      setCooldown(Date.now() + 60_000);
      setNow(Date.now());
      setNotice('Thanks! Your stop report was submitted.');
      setSubmitted(activity);
      await reports.refetch();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not submit report.');
    } finally {
      setPending(null);
    }
  }
  const disabled = !stop || busy || !online || now < cooldown;
  const confirmed = now < cooldown ? submitted : null;
  return (
    <section
      className="crowd-panel stop-reports"
      style={{ '--report-color': route?.color || '#007981' } as React.CSSProperties}
      aria-label={t('Passenger stop reports')}
    >
      <div className="crowd-heading">
        <div>
          <Users size={19} />
          <strong>{t('Updates from riders')}</strong>
        </div>
        <Button
          type="button"
          className="report-refresh icon-button"
          aria-label={t('Refresh passenger reports')}
          onClick={() => reports.refetch()}
          disabled={!stop || !online || reports.isFetching}
        >
          <RefreshCw size={16} className={reports.isFetching ? 'spin' : ''} />
        </Button>
      </div>
      <p className="crowd-note">
        {t(
          'Passenger observations at this stop, not live tracking or arrival predictions. Reports expire after 15 minutes.',
        )}
      </p>
      <div className="report-context">
        <span className="report-route-badge">
          <BusFront size={17} aria-hidden="true" />
          {t('{lot} Lot shuttle', { lot })}
        </span>
        {stop && (
          <strong>
            <MapPin size={16} aria-hidden="true" />
            {stop.name}
          </strong>
        )}
      </div>
      <p className="crowd-note">
        {t(
          'Match the bus destination sign before reporting. These buttons report only the {lot} shuttle at this stop.',
          { lot },
        )}
      </p>
      <div aria-live="polite">
        {!online && (
          <p className="crowd-message">
            {t('You are offline. Connect to view or send passenger reports.')}
          </p>
        )}
        {online && reports.isError && (
          <p className="crowd-message">{t('Community reports are unavailable right now.')}</p>
        )}
        {!stop && (
          <p className="crowd-message">{t('Choose a boarding stop to view and send reports.')}</p>
        )}
        {stop && online && !reports.isError && !recent.length && (
          <p className="crowd-message">
            {reports.isFetching ? t('Loading crowd reports…') : t('No recent passenger reports.')}
          </p>
        )}
        {recent.slice(0, 8).map((report, index) => (
          <div
            className={`crowd-summary passenger-observation observation-${report.activity}`}
            key={`${report.reportedAt}:${index}`}
          >
            <strong>
              <BusFront size={17} aria-hidden="true" />
              {actionLabel(report.activity)}
              {report.occupancy ? ` · ${t(levels[report.occupancy])}` : ''}
            </strong>
            <time dateTime={report.reportedAt}>
              {new Date(report.reportedAt).toLocaleTimeString(
                language === 'my' ? 'my-MM' : language === 'es' ? 'es-US' : 'en-US',
                { hour: 'numeric', minute: '2-digit' },
              )}
            </time>
            <small>
              {t('{minutes} min ago', {
                minutes: Math.floor((now - Date.parse(report.reportedAt)) / 60_000),
              })}
            </small>
          </div>
        ))}
      </div>
      <div className="stop-report-actions">
        <Button
          className={`report-action report-arrived ${confirmed === 'arrived' ? 'report-sent' : ''}`}
          type="button"
          aria-busy={pending === 'arrived'}
          disabled={disabled}
          onClick={() => send('arrived')}
        >
          <span className="report-action-icon" aria-hidden="true">
            {pending === 'arrived' ? (
              <LoaderCircle className="spin" size={25} />
            ) : confirmed === 'arrived' ? (
              <Check size={25} />
            ) : (
              <ArrowDownToLine size={25} />
            )}
          </span>
          <span>
            <strong>{actionLabel('arrived')}</strong>
            <small>
              {pending === 'arrived'
                ? t('Submitting…')
                : confirmed === 'arrived'
                  ? t('Report sent')
                  : t('I see this shuttle at the stop')}
            </small>
          </span>
        </Button>
        <Button
          className={`report-action report-departed ${confirmed === 'departed' ? 'report-sent' : ''}`}
          type="button"
          aria-busy={pending === 'departed'}
          disabled={disabled}
          onClick={() => send('departed')}
        >
          <span className="report-action-icon" aria-hidden="true">
            {pending === 'departed' ? (
              <LoaderCircle className="spin" size={25} />
            ) : confirmed === 'departed' ? (
              <Check size={25} />
            ) : (
              <ArrowUpRight size={25} />
            )}
          </span>
          <span>
            <strong>{actionLabel('departed')}</strong>
            <small>
              {pending === 'departed'
                ? t('Submitting…')
                : confirmed === 'departed'
                  ? t('Report sent')
                  : t('I saw this shuttle leave')}
            </small>
          </span>
        </Button>
      </div>
      <form
        className="crowd-form"
        onSubmit={(event) => {
          event.preventDefault();
          void send('crowding');
        }}
      >
        <label>
          {t('Crowd level')}
          <select
            disabled={busy}
            value={level}
            onChange={(event) => setLevel(event.target.value as CrowdLevel)}
          >
            {Object.entries(levels).map(([value, label]) => (
              <option key={value} value={value}>
                {t(label)}
              </option>
            ))}
          </select>
        </label>
        <Button
          className={`button-primary report-crowd-submit ${confirmed === 'crowding' ? 'report-sent' : ''}`}
          type="submit"
          aria-busy={pending === 'crowding'}
          disabled={disabled}
        >
          {pending === 'crowding' ? (
            <LoaderCircle className="spin" size={18} aria-hidden="true" />
          ) : confirmed === 'crowding' ? (
            <Check size={18} aria-hidden="true" />
          ) : (
            <Send size={18} aria-hidden="true" />
          )}
          {pending === 'crowding'
            ? t('Submitting…')
            : confirmed === 'crowding'
              ? t('Report sent')
              : t('Report {lot} shuttle crowding', { lot })}
        </Button>
      </form>
      {now < cooldown && (
        <p className="crowd-note">{t('Please wait a minute before reporting again.')}</p>
      )}
      {notice && (
        <p
          className={`crowd-message report-notice ${submitted ? 'report-notice-success' : ''}`}
          role="status"
        >
          {submitted && <Check size={17} aria-hidden="true" />}
          {t(notice)}
        </p>
      )}
    </section>
  );
}

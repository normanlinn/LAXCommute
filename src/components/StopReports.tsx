import { useEffect, useId, useState } from 'react';
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
} from './ui/icons';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../i18n/LanguageProvider';
import { useOnline } from '../hooks/useShuttle';
import { getStopReports, sendStopReport, type CrowdLevel } from '../services/community';
import { recentStopReports, type StopActivity } from '../domain/stop-reports';
import { ROUTES } from '../domain/commute';
import type { Stop } from '../types';
import Button from './ui/Button';
import Dialog from './ui/Dialog';
import Row from './ui/Row';

const levels = {
  empty: 'Empty',
  seats: 'Seats available',
  standing: 'Standing room',
  full: 'Full',
};
/** A "Rider reports" row with the latest report; it opens a sheet to read and send reports. */
export default function StopReports({
  routeId,
  stop,
  open,
  onOpenChange,
}: {
  routeId: number;
  stop?: Stop;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t, language } = useLanguage();
  const titleId = useId();
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
  const latest = recent[0];
  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(
      language === 'my' ? 'my-MM' : language === 'es' ? 'es-US' : 'en-US',
      { hour: 'numeric', minute: '2-digit' },
    );
  return (
    <>
      <Row
        icon={<Users size={18} />}
        label={t('Rider reports')}
        detail={
          latest
            ? `${actionLabel(latest.activity)} · ${t('{minutes} min ago', {
                minutes: Math.floor((now - Date.parse(latest.reportedAt)) / 60_000),
              })}`
            : t('No reports in the last 15 min')
        }
        aria-haspopup="dialog"
        onClick={() => onOpenChange(true)}
      />
      <Dialog
        open={open}
        onClose={() => onOpenChange(false)}
        titleId={titleId}
        title={t('Report the {lot} shuttle', { lot })}
        closeLabel={t('Close')}
        className="stop-reports"
      >
        <div className="report-context">
          <span className="report-route-badge">
            <BusFront size={14} aria-hidden="true" />
            {t('{lot} Lot shuttle', { lot })}
          </span>
          {stop && (
            <strong>
              <MapPin size={14} aria-hidden="true" />
              {stop.name}
            </strong>
          )}
        </div>
        <p className="crowd-note">
          {t(
            'Check the bus sign says {lot}. Reports from riders, not live tracking; they expire after 15 minutes.',
            { lot },
          )}
        </p>
        <div className="stop-report-actions">
          <Button
            className={`report-action report-arrived ${confirmed === 'arrived' ? 'report-sent' : ''}`}
            type="button"
            aria-busy={pending === 'arrived'}
            disabled={disabled}
            aria-label={actionLabel('arrived')}
            onClick={() => send('arrived')}
          >
            <span className="report-action-icon" aria-hidden="true">
              {pending === 'arrived' ? (
                <LoaderCircle className="spin" size={20} />
              ) : confirmed === 'arrived' ? (
                <Check size={20} />
              ) : (
                <ArrowDownToLine size={20} />
              )}
            </span>
            <span>
              <strong>{t('Arrived')}</strong>
              <small>
                {pending === 'arrived'
                  ? t('Submitting…')
                  : confirmed === 'arrived'
                    ? t('Report sent')
                    : t('I see it here')}
              </small>
            </span>
          </Button>
          <Button
            className={`report-action report-departed ${confirmed === 'departed' ? 'report-sent' : ''}`}
            type="button"
            aria-busy={pending === 'departed'}
            disabled={disabled}
            aria-label={actionLabel('departed')}
            onClick={() => send('departed')}
          >
            <span className="report-action-icon" aria-hidden="true">
              {pending === 'departed' ? (
                <LoaderCircle className="spin" size={20} />
              ) : confirmed === 'departed' ? (
                <Check size={20} />
              ) : (
                <ArrowUpRight size={20} />
              )}
            </span>
            <span>
              <strong>{t('Departed')}</strong>
              <small>
                {pending === 'departed'
                  ? t('Submitting…')
                  : confirmed === 'departed'
                    ? t('Report sent')
                    : t('I saw it leave')}
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
            className={`button-light report-crowd-submit ${confirmed === 'crowding' ? 'report-sent' : ''}`}
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
        <div className="report-list" aria-live="polite">
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
              <time dateTime={report.reportedAt}>{time(report.reportedAt)}</time>
              <small>
                {t('{minutes} min ago', {
                  minutes: Math.floor((now - Date.parse(report.reportedAt)) / 60_000),
                })}
              </small>
            </div>
          ))}
        </div>
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
        <Button
          className="text-button report-refresh"
          onClick={() => reports.refetch()}
          disabled={!stop || !online || reports.isFetching}
        >
          <RefreshCw size={15} className={reports.isFetching ? 'spin' : ''} aria-hidden="true" />
          {t('Refresh passenger reports')}
        </Button>
      </Dialog>
    </>
  );
}

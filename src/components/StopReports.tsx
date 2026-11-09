import { useEffect, useState } from 'react';
import { Users, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../i18n/LanguageProvider';
import { useOnline } from '../hooks/useShuttle';
import { getStopReports, sendStopReport, type CrowdLevel } from '../services/community';
import { activityLabels, recentStopReports, type StopActivity } from '../domain/stop-reports';
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
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [level, setLevel] = useState<CrowdLevel>('seats');
  const [cooldown, setCooldown] = useState(0);
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
    setBusy(true);
    setNotice('');
    try {
      await sendStopReport(routeId, stop.id, activity, activity === 'crowding' ? level : undefined);
      setCooldown(Date.now() + 60_000);
      setNow(Date.now());
      setNotice('Thanks! Your stop report was submitted.');
      await reports.refetch();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not submit report.');
    } finally {
      setBusy(false);
    }
  }
  const disabled = !stop || busy || !online || now < cooldown;
  return (
    <section className="crowd-panel" aria-label={t('Passenger stop reports')}>
      <div className="crowd-heading">
        <div>
          <Users size={19} />
          <strong>{t('Updates from riders')}</strong>
        </div>
        <Button
          type="button"
          aria-label={t('Refresh passenger reports')}
          onClick={() => reports.refetch()}
          disabled={!stop || !online || reports.isFetching}
        >
          <RefreshCw size={16} />
        </Button>
      </div>
      <p className="crowd-note">
        {t(
          'Passenger observations at this stop, not live tracking or arrival predictions. Reports expire after 15 minutes.',
        )}
      </p>
      {stop && <strong>{stop.name}</strong>}
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
          <div className="crowd-summary" key={`${report.reportedAt}:${index}`}>
            <strong>
              {t(activityLabels[report.activity])}
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
        <Button type="button" disabled={disabled} onClick={() => send('arrived')}>
          {t('Bus arrived')}
        </Button>
        <Button type="button" disabled={disabled} onClick={() => send('departed')}>
          {t('Just departed')}
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
          <select value={level} onChange={(event) => setLevel(event.target.value as CrowdLevel)}>
            {Object.entries(levels).map(([value, label]) => (
              <option key={value} value={value}>
                {t(label)}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" disabled={disabled}>
          {busy ? t('Submitting…') : t('Report crowd level')}
        </Button>
      </form>
      {now < cooldown && (
        <p className="crowd-note">{t('Please wait a minute before reporting again.')}</p>
      )}
      {notice && (
        <p className="crowd-message" role="status">
          {t(notice)}
        </p>
      )}
    </section>
  );
}

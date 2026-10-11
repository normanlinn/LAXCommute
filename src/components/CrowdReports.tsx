import { useEffect, useState } from 'react';
import { Users, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '../i18n/LanguageProvider';
import { getCrowdReports, sendCrowdReport, type CrowdLevel } from '../services/community';
import Button from './ui/Button';
import type { Vehicle } from '../types';

const levels: CrowdLevel[] = ['empty', 'seats', 'standing', 'full'];
const labels: Record<CrowdLevel, string> = {
  empty: 'Empty', seats: 'Seats available', standing: 'Standing room', full: 'Full',
};
export default function CrowdReports({ routeId, vehicles }: { routeId: number; vehicles: Vehicle[] }) {
  const { t } = useLanguage();
  const [busId, setBusId] = useState<number>(0);
  const [level, setLevel] = useState<CrowdLevel>('seats');
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const crowd = useQuery({
    queryKey: ['community-crowd', routeId],
    queryFn: () => getCrowdReports(routeId),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
  });
  useEffect(() => { setBusId(0); setNotice(''); }, [routeId]);
  const available = vehicles.filter((vehicle) => Number.isSafeInteger(vehicle.id) && vehicle.id > 0);
  const summary = crowd.data?.filter((item) =>
    available.some((vehicle) => vehicle.id === item.vehicleId) &&
    Date.now() - Date.parse(item.reportedAt) < 15 * 60_000
  ) || [];
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!available.some((vehicle) => vehicle.id === busId)) return;
    setSubmitting(true);
    setNotice('');
    try {
      await sendCrowdReport(routeId, busId, level);
      setNotice(t('Thanks! Your crowd report was submitted.'));
      await crowd.refetch();
    } catch (error) {
      setNotice(error instanceof Error ? t(error.message) : t('Could not submit report.'));
    } finally { setSubmitting(false); }
  }
  return (
    <section className="crowd-panel" aria-label={t('Community crowd reports')}>
      <div className="crowd-heading"><div><Users size={19} /><strong>{t('How crowded is the bus?')}</strong></div>
        <Button type="button" aria-label={t('Refresh community reports')} onClick={() => crowd.refetch()} disabled={crowd.isFetching}><RefreshCw size={16} /></Button>
      </div>
      <p className="crowd-note">{t('Passenger reports only, not official live capacity. Reports expire after 15 minutes.')}</p>
      {crowd.isError && <p role="status" className="crowd-message">{t('Community reports are unavailable right now.')}</p>}
      {!crowd.isError && (summary.length ? summary.map((item) => (
        <div className="crowd-summary" key={item.vehicleId}>
          <span>{t('Bus {name}', { name: available.find((v) => v.id === item.vehicleId)?.name || item.vehicleId })}</span>
          <strong>{t(labels[item.occupancy])}</strong>
          <small>{t('{count} recent reports', { count: item.reports })} · {t('{minutes} min ago', { minutes: Math.max(0, Math.floor((Date.now() - Date.parse(item.reportedAt)) / 60000)) })}</small>
        </div>
      )) : <p className="crowd-message">{crowd.isPending ? t('Loading crowd reports…') : t('No recent passenger reports.')}</p>)}
      <form onSubmit={submit} className="crowd-form">
        <label>{t('Which bus are you on?')}
          <select value={busId} onChange={(e) => setBusId(Number(e.target.value))} required>
            <option value={0}>{t('Choose a bus')}</option>
            {available.map((bus) => <option key={bus.id} value={bus.id}>{t('Bus {name}', { name: bus.name || bus.id })}</option>)}
          </select>
        </label>
        <label>{t('Crowd level')}
          <select value={level} onChange={(e) => setLevel(e.target.value as CrowdLevel)}>
            {levels.map((item) => <option key={item} value={item}>{t(labels[item])}</option>)}
          </select>
        </label>
        <Button className="button-primary" type="submit" disabled={!busId || submitting || !navigator.onLine}>
          {submitting ? t('Submitting…') : t('Report crowd level')}
        </Button>
      </form>
      {!available.length && <p className="crowd-note">{t('Wait for a fresh bus location to submit a report.')}</p>}
      {notice && <p className="crowd-message" role="status">{notice}</p>}
    </section>
  );
}

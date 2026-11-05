import { ExternalLink, RefreshCw } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageProvider';
import Button from './ui/Button';

// The operator's public tracker opens straight to one stop's live arrivals.
// It cannot be embedded, so riders are sent there in a new tab.
const DIRECTIONS: Record<number, string> = {
  6883: 'west-lot',
  6884: 'east-lot',
  6885: 'south-lot',
};
export function officialTrackerURL(routeID?: number, stopID?: number) {
  const direction = routeID ? DIRECTIONS[routeID] : undefined;
  if (!direction) return 'https://shuttles.flylax.com/employeeparking';
  const route = `https://laxbus.syncromatics.com/route/${routeID}/direction/${direction}`;
  return stopID ? `${route}/stop/${stopID}/arrivals` : route;
}

/** Shown while LAXCommute's own feed is down, so riders are never left without times. */
export default function OfficialTracker({
  routeID,
  stopID,
  stopName,
  retrying,
  onRetry,
}: {
  routeID?: number;
  stopID?: number;
  stopName?: string;
  retrying: boolean;
  onRetry: () => void;
}) {
  const { t } = useLanguage();
  return (
    <section className="official-tracker" aria-label={t('Official LAX live tracker')}>
      <div className="official-tracker-status" role="status">
        <span className="status-dot" aria-hidden="true" />
        <div>
          <strong>{t('Live times are reconnecting')}</strong>
          <span>
            {t(
              'We keep retrying automatically. Until then, the official LAX tracker has the same buses.',
            )}
          </span>
        </div>
        <Button
          type="button"
          className="icon-button"
          aria-label={t('Try our live feed again')}
          title={t('Try our live feed again')}
          onClick={onRetry}
          disabled={retrying}
        >
          <RefreshCw size={17} className={retrying ? 'spin' : ''} />
        </Button>
      </div>
      <a
        className="official-tracker-open"
        href={officialTrackerURL(routeID, stopID)}
        target="_blank"
        rel="noreferrer"
      >
        {stopName ? t('Live times for {stop}', { stop: stopName }) : t('Open official live times')}{' '}
        <ExternalLink size={16} aria-hidden="true" />
      </a>
    </section>
  );
}

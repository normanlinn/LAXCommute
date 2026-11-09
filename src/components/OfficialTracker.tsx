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
          <strong>{t('Plan your trip while live tracking is paused')}</strong>
          <span>
            {t(
              'Your selected route and stop open directly in the official tracker. Live arrivals are shown there.',
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
        {t('View official live arrivals')} <ExternalLink size={16} aria-hidden="true" />
      </a>
      <div className="official-tracker-details">
        {stopName && <p className="crowd-note">{stopName}</p>}
        <p className="crowd-note">
          {t(
            'Typical service: every 7–15 minutes. This is general service guidance, not an arrival prediction.',
          )}{' '}
          <a
            href="https://www.flylax.com/sites/lax/files/2026-06/Employee%20Lots%20Rules%20and%20Regulations%202026.pdf"
            target="_blank"
            rel="noreferrer"
          >
            {t('LAX service information')}
          </a>
        </p>
      </div>
    </section>
  );
}

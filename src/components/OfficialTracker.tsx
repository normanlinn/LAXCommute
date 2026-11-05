import { ExternalLink, RefreshCw } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageProvider';
import Button from './ui/Button';

// LAX's own live-times pages, one per lot. They cannot be embedded (SAMEORIGIN).
const LOT_PAGES: Record<number, string> = {
  6883: 'westlot',
  6884: 'eastlot',
  6885: 'southlot',
};
export function officialTrackerURL(routeID?: number) {
  const lot = routeID ? LOT_PAGES[routeID] : undefined;
  return `https://shuttles.flylax.com/employeeparking${lot ? `/${lot}` : ''}`;
}

/** Shown while LAXCommute's own feed is down, so riders are never left without times. */
export default function OfficialTracker({
  routeID,
  retrying,
  onRetry,
}: {
  routeID?: number;
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
        href={officialTrackerURL(routeID)}
        target="_blank"
        rel="noreferrer"
      >
        {t('Open official live times')} <ExternalLink size={16} aria-hidden="true" />
      </a>
    </section>
  );
}

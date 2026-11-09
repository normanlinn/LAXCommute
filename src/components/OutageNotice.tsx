import { useState } from 'react';
import { ExternalLink, Megaphone, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageProvider';
import { officialTrackerURL } from './OfficialTracker';

const DISMISS_KEY = 'laxcommute:outage-notice-dismissed';
// A dismissed notice comes back after this long if the outage is still going.
const DISMISS_MS = 12 * 60 * 60_000;

function dismissedRecently() {
  try {
    return Date.now() - Number(localStorage.getItem(DISMISS_KEY) || 0) < DISMISS_MS;
  } catch {
    return false;
  }
}

/** Explains the live-data outage to riders while it lasts. */
export default function OutageNotice({ routeID, stopID }: { routeID?: number; stopID?: number }) {
  const { t } = useLanguage();
  const [hidden, setHidden] = useState(dismissedRecently);
  if (hidden) return null;
  return (
    <aside className="outage-notice" role="status" aria-label={t('Service announcement')}>
      <Megaphone size={20} aria-hidden="true" className="outage-icon" />
      <div className="outage-copy">
        <strong>{t('Live bus times are temporarily unavailable')}</strong>
        <p>
          {t(
            'The developer is still contacting LAX and Syncromatics for authorized API access so LAXCommute can become fully functional again, including live bus locations and arrival times.',
          )}
        </p>
        <p>
          {t(
            'Saved trips, stop maps and passenger reports remain available. Use the official tracker for live arrivals.',
          )}{' '}
          <a href={officialTrackerURL(routeID, stopID)} target="_blank" rel="noreferrer">
            {t('Open official tracker')} <ExternalLink size={13} aria-hidden="true" />
          </a>
        </p>
      </div>
      <button
        type="button"
        className="btn btn-ghost outage-dismiss"
        aria-label={t('Dismiss announcement')}
        onClick={() => {
          setHidden(true);
          try {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
          } catch {
            /* Hidden for this visit only. */
          }
        }}
      >
        <X size={18} />
      </button>
    </aside>
  );
}

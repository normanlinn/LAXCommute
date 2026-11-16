import { useId } from 'react';
import { ExternalLink } from './ui/icons';
import { useLanguage } from '../i18n/LanguageProvider';
import { officialTrackerURL } from './OfficialTracker';
import Button from './ui/Button';
import Dialog from './ui/Dialog';

/** Explains, on request, why live times are paused and where to find them meanwhile. */
export default function OutageNotice({
  open,
  onClose,
  routeID,
  stopID,
}: {
  open: boolean;
  onClose: () => void;
  routeID?: number;
  stopID?: number;
}) {
  const { t } = useLanguage();
  const titleId = useId();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      title={t('Live times are paused')}
      closeLabel={t('Close')}
    >
      <p>
        {t(
          'The developer is still contacting LAX and Syncromatics for authorized API access so LAXCommute can become fully functional again, including live bus locations and arrival times.',
        )}
      </p>
      <p>
        {t(
          'Until then, the card shows the typical time between buses for your lot. Saved trips, stop maps and passenger reports still work.',
        )}
      </p>
      <a
        className="btn button-primary"
        href={officialTrackerURL(routeID, stopID)}
        target="_blank"
        rel="noreferrer"
      >
        {t('Open the official tracker')} <ExternalLink size={16} aria-hidden="true" />
      </a>
      <Button className="button-light" onClick={onClose}>
        {t('Got it')}
      </Button>
    </Dialog>
  );
}

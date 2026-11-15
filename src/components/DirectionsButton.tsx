import { useLanguage } from '../i18n/LanguageProvider';
import { useId, useState } from 'react';
import { ExternalLink, Footprints, Navigation, X } from './ui/icons';
import { directionsLinks } from '../domain/commute';
import Button from './ui/Button';
import Dialog from './ui/Dialog';

/** Opens walking directions to the stop. `compact` renders it as a sheet action tile. */
export default function DirectionsButton({
  stop,
  compact = false,
}: {
  stop: import('../types').Stop;
  compact?: boolean;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  return (
    <>
      {compact ? (
        <Button
          className="sheet-action"
          aria-label={t('Directions to this stop')}
          onClick={() => setOpen(true)}
        >
          <Footprints size={18} aria-hidden="true" />
          {t('Walk there')}
        </Button>
      ) : (
        <Button className="directions-link" onClick={() => setOpen(true)}>
          <Navigation size={15} /> {t('Directions to this stop')}{' '}
        </Button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} titleId={titleId}>
        <Button
          className="modal-close"
          aria-label={t('Close directions')}
          onClick={() => setOpen(false)}
        >
          <X size={19} />
        </Button>
        <span className="eyebrow">{t('WALK TO YOUR SHUTTLE')}</span>
        <h2 id={titleId}>{t('Open directions')}</h2>
        <p>{stop.name}</p>
        <div className="directions-options">
          {directionsLinks(stop).map(({ label, href }) => (
            <a key={label} href={href} className="btn btn-soft button button-light">
              {label} <ExternalLink size={16} />
            </a>
          ))}
        </div>
      </Dialog>
    </>
  );
}

import { useLanguage } from '../i18n/LanguageProvider';
import { useId, useState } from 'react';
import { ExternalLink, Footprints } from './ui/icons';
import { directionsLinks } from '../domain/commute';
import Button from './ui/Button';
import Dialog from './ui/Dialog';

/** The "Walk there" action tile; it offers walking directions to the stop in a map app. */
export default function DirectionsButton({ stop }: { stop: import('../types').Stop }) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const titleId = useId();
  return (
    <>
      <Button
        className="action-tile"
        aria-label={t('Directions to this stop')}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
      >
        <Footprints size={20} aria-hidden="true" />
        {t('Walk there')}
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        titleId={titleId}
        title={t('Open directions')}
        closeLabel={t('Close directions')}
      >
        <p>{stop.name}</p>
        <div className="group">
          {directionsLinks(stop).map(({ label, href }) => (
            <a key={label} href={href} className="row" target="_blank" rel="noreferrer">
              <span className="row-text">
                <strong>{label}</strong>
              </span>
              <ExternalLink size={16} className="row-chevron" aria-hidden="true" />
            </a>
          ))}
        </div>
      </Dialog>
    </>
  );
}

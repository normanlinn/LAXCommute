import { useId } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';
import Button from './ui/Button';
import Dialog from './ui/Dialog';

/** First-visit sheet: set up the usual trip, or look around first. */
export default function CommuteWelcome({
  open,
  onSetup,
  onSkip,
}: {
  open: boolean;
  onSetup: () => void;
  onSkip: () => void;
}) {
  const titleId = useId();
  const { t } = useLanguage();
  return (
    <Dialog open={open} onClose={onSkip} titleId={titleId} className="welcome">
      <img className="welcome-logo" src="/icons/commute-v9-192.png" alt="" width={64} height={64} />
      <h2 id={titleId}>{t('Save your usual trip.')}</h2>
      <p>
        {t('Tell us your lot and terminal once. LAXCommute opens on your next shuttle every time.')}
      </p>
      <Button className="button-primary" onClick={onSetup}>
        {t('Set up my trip')}
      </Button>
      <Button className="button-light" onClick={onSkip}>
        {t('Explore first')}
      </Button>
    </Dialog>
  );
}

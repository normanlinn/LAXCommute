import { useId } from 'react';
import { Bookmark, ArrowRight, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageProvider';
import Button from './ui/Button';
import Dialog from './ui/Dialog';

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
    <Dialog open={open} onClose={onSkip} titleId={titleId}>
      <div className="commute-welcome">
        <div className="preferences-heading">
          <div className="feature-icon welcome-bookmark">
            <Bookmark size={28} />
          </div>
          <Button aria-label={t('Close introduction')} onClick={onSkip}>
            <X size={20} />
          </Button>
        </div>
        <span className="eyebrow">{t('WELCOME TO LAXCOMMUTE')}</span>
        <h2 id={titleId}>{t('Save your usual trip.')}</h2>
        <p>{t('Which lot do you park in? Set your lot and terminal in My commute.')}</p>
        <div className="welcome-tip">
          <Bookmark size={22} />
          <div>
            <strong>{t('My commute')}</strong>
            <span>
              {t(
                'Tap the bookmark below. Turn on Remember my commute to save your choices for next time.',
              )}
            </span>
          </div>
        </div>
        <p className="small muted">
          {t('The first trip shown is South Lot to Terminal B. Change it to match your commute.')}
        </p>
        <Button className="button button-primary full-width" onClick={onSetup}>
          {t('Set up my commute')}
          <ArrowRight size={18} />
        </Button>
        <Button className="button button-light full-width" onClick={onSkip}>
          {t('Explore first')}
        </Button>
      </div>
    </Dialog>
  );
}

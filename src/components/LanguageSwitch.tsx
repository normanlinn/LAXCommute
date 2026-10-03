import { useLanguage } from '../i18n/LanguageProvider';
import Button from './ui/Button';

export default function LanguageSwitch() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div className="language-switch" role="group" aria-label={t('Language')}>
      <Button lang="en" aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>
        English
      </Button>
      <Button lang="my" aria-pressed={language === 'my'} onClick={() => setLanguage('my')}>
        မြန်မာ
      </Button>
    </div>
  );
}

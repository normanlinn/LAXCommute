import { useLanguage } from '../i18n/LanguageProvider';
import Dialog from './ui/Dialog';
import Button from './ui/Button';
import Row from './ui/Row';
import { useEffect, useState } from 'react';
import { CirclePlus, Share } from './ui/icons';
import UpdatePrompt from './UpdatePrompt';
import { useRegisterSW } from 'virtual:pwa-register/react';

/** Offers a new version of the app when the service worker has one waiting. */
export function AppUpdates() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <UpdatePrompt
      onUpdate={() => updateServiceWorker(true)}
      onDismiss={() => setNeedRefresh(false)}
    />
  );
}

/** An "Add to Home Screen" row: the browser's install prompt, or steps for this phone. */
export default function InstallApp() {
  const { t } = useLanguage();
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState(
    /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'iphone' : 'android',
  );
  const [installed, setInstalled] = useState(() =>
    Boolean(matchMedia('(display-mode: standalone)').matches || navigator.standalone),
  );
  useEffect(() => {
    const receive = (event: BeforeInstallPromptEvent) => {
      event.preventDefault();
      setPrompt(event);
    };
    const done = () => {
      setPrompt(null);
      setOpen(false);
      setInstalled(true);
    };
    const displayMode = matchMedia('(display-mode: standalone)');
    const updateDisplayMode = () =>
      setInstalled(Boolean(displayMode.matches || navigator.standalone));
    displayMode.addEventListener?.('change', updateDisplayMode);
    addEventListener('beforeinstallprompt', receive);
    addEventListener('appinstalled', done);
    return () => {
      removeEventListener('beforeinstallprompt', receive);
      removeEventListener('appinstalled', done);
      displayMode.removeEventListener?.('change', updateDisplayMode);
    };
  }, []);
  async function install() {
    if (!prompt) {
      setOpen(true);
      return;
    }
    try {
      await prompt.prompt();
      await prompt.userChoice;
    } catch {
      setOpen(true);
    } finally {
      setPrompt(null);
    }
  }
  if (installed) return null;
  return (
    <>
      <Row
        icon={<CirclePlus size={18} />}
        label={t('Add to home screen')}
        aria-haspopup="dialog"
        onClick={install}
      />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        titleId="install-title"
        title={t('Your commute, one tap away.')}
        closeLabel={t('Close installation instructions')}
      >
        <p>{t('Add LAXCommute to your home screen for an app-style experience.')}</p>
        <div className="segmented" role="group" aria-label={t('Your phone')}>
          <Button
            aria-pressed={platform === 'iphone'}
            className={platform === 'iphone' ? 'active' : ''}
            onClick={() => setPlatform('iphone')}
          >
            iPhone
          </Button>
          <Button
            aria-pressed={platform === 'android'}
            className={platform === 'android' ? 'active' : ''}
            onClick={() => setPlatform('android')}
          >
            Android
          </Button>
        </div>
        {platform === 'iphone' ? (
          <ol className="steps">
            <li>{t('Open this website in Safari.')}</li>
            <li>
              {t('Tap Share, then choose Add to Home Screen and Add.')} <Share size={14} />
            </li>
          </ol>
        ) : (
          <ol className="steps">
            <li>{t('Open this website in Chrome.')}</li>
            <li>{t('Tap the three-dot menu.')}</li>
            <li>{t('Choose Install app or Add to home screen.')}</li>
          </ol>
        )}
        <p className="hint">
          {t(
            'Live bus data needs an internet connection. Home-screen installation needs a secure HTTPS website.',
          )}
        </p>
        <Button className="button-primary" onClick={() => setOpen(false)}>
          {t('Got it')}
        </Button>
      </Dialog>
    </>
  );
}

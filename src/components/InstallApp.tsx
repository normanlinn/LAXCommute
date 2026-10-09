import { useLanguage } from '../i18n/LanguageProvider';
import Dialog from './ui/Dialog';
import Button from './ui/Button';
import { useEffect, useState } from 'react';
import { Download, Share, X, Smartphone } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

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
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
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
    displayMode.addEventListener('change', updateDisplayMode);
    addEventListener('beforeinstallprompt', receive);
    addEventListener('appinstalled', done);
    return () => {
      removeEventListener('beforeinstallprompt', receive);
      removeEventListener('appinstalled', done);
      displayMode.removeEventListener('change', updateDisplayMode);
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
  return (
    <>
      {!installed && (
        <Button
          type="button"
          className="install-button"
          onClick={install}
          aria-label={t('Add to home screen')}
        >
          <Download size={16} />
          <span>{t('Add to home screen')}</span>
        </Button>
      )}
      {needRefresh && (
        <div className="update-toast" role="status">
          <span>{t('A new version is ready.')}</span>
          <Button onClick={() => updateServiceWorker(true)}>{t('Update')}</Button>
          <Button aria-label={t('Dismiss app update')} onClick={() => setNeedRefresh(false)}>
            <X size={16} />
          </Button>
        </div>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} titleId="install-title">
        <Button
          className="modal-close icon-button"
          onClick={() => setOpen(false)}
          aria-label={t('Close installation instructions')}
        >
          <X size={20} />
        </Button>
        <div className="feature-icon">
          <Smartphone size={26} />
        </div>
        <h2 id="install-title">{t('Your commute, one tap away.')}</h2>
        <p>{t('Add LAXCommute to your home screen for an app-style experience.')}</p>
        <div className="tabs tabs-box segmented">
          <Button
            className={platform === 'iphone' ? 'tab tab-active active' : 'tab'}
            onClick={() => setPlatform('iphone')}
          >
            iPhone
          </Button>
          <Button
            className={platform === 'android' ? 'tab tab-active active' : 'tab'}
            onClick={() => setPlatform('android')}
          >
            Android
          </Button>
        </div>
        {platform === 'iphone' ? (
          <ol>
            <li>{t('Open this website in Safari.')}</li>
            <li>
              {t('Tap Share, then choose Add to Home Screen and Add.')} <Share size={14} />
            </li>
          </ol>
        ) : (
          <ol>
            <li>{t('Open this website in Chrome.')}</li>
            <li>{t('Tap the three-dot menu.')}</li>
            <li>{t('Choose Install app or Add to home screen.')}</li>
          </ol>
        )}
        <p className="small muted">
          {' '}
          {t(
            'Live bus data needs an internet connection. Home-screen installation needs a secure HTTPS website.',
          )}{' '}
        </p>
        <Button className="button button-primary full-width" onClick={() => setOpen(false)}>
          {' '}
          {t('Got it')}{' '}
        </Button>
      </Dialog>
    </>
  );
}

import Dialog from './ui/Dialog';
import Button from './ui/Button';
import { useEffect, useState } from 'react';
import { Download, Share, X, Smartphone } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function InstallApp() {
  const [prompt, setPrompt] = useState(null);
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState(
    /iPhone|iPad|iPod/.test(navigator.userAgent) ? 'iphone' : 'android',
  );
  const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    const receive = (event) => {
      event.preventDefault();
      setPrompt(event);
    };
    const done = () => {
      setPrompt(null);
      setOpen(false);
    };
    addEventListener('beforeinstallprompt', receive);
    addEventListener('appinstalled', done);
    return () => {
      removeEventListener('beforeinstallprompt', receive);
      removeEventListener('appinstalled', done);
    };
  }, []);
  async function install() {
    if (!prompt) {
      setOpen(true);
      return;
    }
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
  }
  return (
    <>
      {!installed && (
        <Button
          type="button"
          className="install-button"
          onClick={install}
          aria-label="Add to home screen"
        >
          <Download size={16} />
          <span>Add to home screen</span>
        </Button>
      )}
      {needRefresh && (
        <div className="update-toast" role="status">
          <span>A new version is ready.</span>
          <Button onClick={() => updateServiceWorker(true)}>Update</Button>
          <Button aria-label="Dismiss app update" onClick={() => setNeedRefresh(false)}>
            <X size={16} />
          </Button>
        </div>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} titleId="install-title">
        <Button
          className="modal-close icon-button"
          onClick={() => setOpen(false)}
          aria-label="Close installation instructions"
        >
          <X size={20} />
        </Button>
        <div className="feature-icon">
          <Smartphone size={26} />
        </div>
        <h2 id="install-title">Your commute, one tap away.</h2>
        <p>Add LAXCommute to your home screen for an app-style experience.</p>
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
            <li>Open this website in Safari.</li>
            <li>
              Tap <strong>Share</strong> <Share size={14} />.
            </li>
            <li>
              Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
            </li>
          </ol>
        ) : (
          <ol>
            <li>Open this website in Chrome.</li>
            <li>Tap the three-dot menu.</li>
            <li>
              Choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
            </li>
          </ol>
        )}
        <p className="small muted">
          Live bus data needs an internet connection. Home-screen installation needs a secure HTTPS
          website.
        </p>
        <Button className="button button-primary full-width" onClick={() => setOpen(false)}>
          Got it
        </Button>
      </Dialog>
    </>
  );
}

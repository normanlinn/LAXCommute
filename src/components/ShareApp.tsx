import { useEffect, useId, useState } from 'react';
import { Copy, Share2, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageProvider';
import Button from './ui/Button';
import Dialog from './ui/Dialog';

export const APP_SHARE_URL = 'https://employeeshuttlelax.com/';

export default function ShareApp() {
  const { t } = useLanguage();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 5000);
    return () => clearTimeout(timer);
  }, [copied]);

  async function share() {
    setCopied(false);
    setCopyFailed(false);
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'LAXCommute',
          text: t('Check your next LAX shuttle. Open the link and add it to your home screen.'),
          url: APP_SHARE_URL,
        });
        return;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
      }
    }
    setOpen(true);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(APP_SHARE_URL);
      setCopyFailed(false);
      setCopied(true);
    } catch {
      setCopyFailed(true);
    }
  }

  return (
    <>
      <Button className="share-button" aria-label={t('Share app')} onClick={share}>
        <Share2 size={18} />
        <span>{t('Share app')}</span>
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} titleId={titleId}>
        <Button
          className="modal-close icon-button"
          aria-label={t('Close sharing')}
          onClick={() => setOpen(false)}
        >
          <X size={20} />
        </Button>
        <h2 id={titleId}>{t('Share LAXCommute')}</h2>
        <p>
          {t('Send this link to a friend or coworker. They can check buses without an account.')}
        </p>
        <label className="share-link-field">
          {t('App link')}
          <input
            className="input"
            readOnly
            value={APP_SHARE_URL}
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
        <Button className="button button-primary full-width" onClick={copy}>
          <Copy size={18} /> {t('Copy link')}
        </Button>
        <p role="status" aria-live="polite">
          {copied
            ? t('Link copied.')
            : copyFailed
              ? t('Select the link above and copy it manually.')
              : ''}
        </p>
        <p>{t('To install, open the link and tap Add to home screen.')}</p>
      </Dialog>
    </>
  );
}

import { useEffect, useId, useState } from 'react';
import { Copy, Share2 } from './ui/icons';
import Row from './ui/Row';
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
      <Row
        icon={<Share2 size={18} />}
        label={t('Share LAXCommute')}
        aria-label={t('Share app')}
        onClick={share}
      />
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        titleId={titleId}
        title={t('Share LAXCommute')}
        closeLabel={t('Close sharing')}
      >
        <p>
          {t('Send this link to a friend or coworker. They can check buses without an account.')}
        </p>
        <label className="share-link-field">
          <span>{t('App link')}</span>
          <input
            className="input"
            readOnly
            value={APP_SHARE_URL}
            onFocus={(event) => event.currentTarget.select()}
          />
        </label>
        <Button className="button-primary" onClick={copy}>
          <Copy size={18} /> {t('Copy link')}
        </Button>
        <p className="hint" role="status" aria-live="polite">
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

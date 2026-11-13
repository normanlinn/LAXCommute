import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../i18n/LanguageProvider';
import Button from './ui/Button';
import { BusFront, RefreshCw, X } from './ui/icons';

type Incoming = { version: string; highlights: string[] };
// If the new version has not taken over by then, reload anyway.
const RELOAD_FALLBACK_MS = 8_000;

/**
 * Shown when a new version is waiting: names the version and its highlights, then
 * covers the app with an "Updating" screen while the new version loads.
 */
export default function UpdatePrompt({
  onUpdate,
  onDismiss,
}: {
  onUpdate: () => void | Promise<void>;
  onDismiss: () => void;
}) {
  const { t } = useLanguage();
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/version.json', { cache: 'no-store', signal: controller.signal })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (typeof data?.version === 'string')
          setIncoming({
            version: data.version,
            highlights: Array.isArray(data.highlights) ? data.highlights.slice(0, 2) : [],
          });
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!updating) return;
    const timer = setTimeout(() => location.reload(), RELOAD_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [updating]);

  if (updating)
    return createPortal(
      <div className="update-screen" role="alertdialog" aria-live="assertive" aria-busy="true">
        <div className="update-screen-card">
          <span className="update-orbit" aria-hidden="true">
            <span className="update-orbit-ring" />
            <BusFront size={30} />
          </span>
          <strong>{t('Updating LAXCommute')}</strong>
          <span>
            {incoming
              ? t('Getting version {version} ready…', { version: incoming.version })
              : t('Getting the new version ready…')}
          </span>
          <span className="update-progress" aria-hidden="true">
            <i />
          </span>
        </div>
      </div>,
      document.body,
    );

  return (
    <div className="update-toast" role="status">
      <span className="update-icon is-pulsing" aria-hidden="true">
        <RefreshCw size={18} />
      </span>
      <span className="update-copy">
        <strong>
          {incoming
            ? t('Version {version} is ready', { version: incoming.version })
            : t('New version ready')}
        </strong>
        {incoming?.highlights.length ? (
          <ul>
            {incoming.highlights.map((text) => (
              <li key={text} lang="en">
                {text}
              </li>
            ))}
          </ul>
        ) : (
          <span>{t('Update to get the latest features and fixes.')}</span>
        )}
      </span>
      <Button
        className="update-now"
        onClick={() => {
          setUpdating(true);
          void onUpdate();
        }}
      >
        {t('Update')}
      </Button>
      <Button className="update-dismiss" aria-label={t('Dismiss app update')} onClick={onDismiss}>
        <X size={16} />
      </Button>
    </div>
  );
}

import { useEffect, useState } from 'react';
import history from 'virtual:release-history';
import { useLanguage } from '../i18n/LanguageProvider';
import Button from './ui/Button';
import { Check, X } from './ui/icons';

const SEEN_KEY = 'laxcommute:seen-version';
const VISIBLE_MS = 12_000;

/** Which version this rider saw last; first visits record it without a message. */
function versionToAnnounce() {
  try {
    const seen = localStorage.getItem(SEEN_KEY);
    localStorage.setItem(SEEN_KEY, history.version);
    return seen && seen !== history.version ? history.version : null;
  } catch {
    return null;
  }
}

// Read and record once per page load (not per render), so React's development
// double-render cannot mark the version as seen before it is announced.
const announced = typeof window === 'undefined' ? null : versionToAnnounce();

/** After an update, a short card with the newest changes, shown once per version. */
export default function WhatsNew() {
  const { t } = useLanguage();
  const [version, setVersion] = useState(announced);
  useEffect(() => {
    if (!version) return;
    const timer = setTimeout(() => setVersion(null), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [version]);
  if (!version) return null;
  const items = history.days.flatMap((day) => day.items).slice(0, 3);
  return (
    <aside className="whats-new-toast" role="status" aria-label={t("What's new")}>
      <span className="update-icon is-done" aria-hidden="true">
        <Check size={18} />
      </span>
      <div className="update-copy">
        <strong>{t('Updated to v{version}', { version })}</strong>
        {items.length > 0 && (
          <ul>
            {items.map((item, index) => (
              <li key={index} lang="en">
                {item.text}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Button className="update-dismiss" aria-label={t('Dismiss')} onClick={() => setVersion(null)}>
        <X size={16} />
      </Button>
    </aside>
  );
}

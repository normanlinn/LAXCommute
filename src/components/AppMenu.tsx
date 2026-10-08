import { useId, useState } from 'react';
import { Menu, Monitor, Moon, Sun, X } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageProvider';
import { useTheme, type ThemePreference } from '../theme/ThemeProvider';
import LanguageSwitch from './LanguageSwitch';
import Button from './ui/Button';
import Dialog from './ui/Dialog';

export default function AppMenu() {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const { t } = useLanguage();
  const { preference, setPreference } = useTheme();
  const choices = [
    { value: 'system', label: 'System', Icon: Monitor },
    { value: 'light', label: 'Light', Icon: Sun },
    { value: 'dark', label: 'Dark', Icon: Moon },
  ] as const;
  return (
    <>
      <Button
        className="menu-button"
        aria-label={t('Open menu')}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu size={22} />
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} titleId={titleId}>
        <div className="preferences-menu">
          <div className="preferences-heading">
            <h2 id={titleId}>{t('Menu')}</h2>
            <Button aria-label={t('Close menu')} onClick={() => setOpen(false)}>
              <X size={22} />
            </Button>
          </div>
          <fieldset className="appearance-settings">
            <legend>{t('Appearance')}</legend>
            <p>{t('System follows your device’s light or dark setting.')}</p>
            <div className="appearance-options">
              {choices.map(({ value, label, Icon }) => (
                <label key={value}>
                  <input
                    type="radio"
                    name={titleId}
                    value={value}
                    checked={preference === value}
                    onChange={() => setPreference(value as ThemePreference)}
                  />
                  <Icon size={22} aria-hidden="true" />
                  <span>{t(label)}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="menu-language">
            <h3>{t('Language')}</h3>
            <LanguageSwitch />
          </div>
          <div className="privacy-note">
            <h3>{t('Privacy')}</h3>
            <p>
              {t(
                'We use hashed network identifiers to limit abusive requests. You can delete your account from Account.',
              )}
            </p>
            <p>
              {t(
                'Guest commute, theme and language settings stay in your browser. If you create an account, Supabase stores your email, password hash and saved commute. Location is used on your device to find nearby stops and is not saved to your account. Map providers receive requests for the area you view. Signing out does not remove settings stored on this device.',
              )}
            </p>
            {import.meta.env.VITE_CF_WEB_ANALYTICS_TOKEN && (
              <p>
                {t(
                  'This app uses Cloudflare Web Analytics to measure visits without analytics cookies.',
                )}
              </p>
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}

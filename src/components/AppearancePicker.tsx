import { useId } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';
import { useTheme, type ThemePreference } from '../theme/ThemeProvider';

const CHOICES = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
] as const;

/** System, Light or Dark, as a row of radio chips. */
export default function AppearancePicker() {
  const { t } = useLanguage();
  const { preference, setPreference } = useTheme();
  const name = useId();
  return (
    <fieldset className="field appearance-picker">
      <legend>{t('Appearance')}</legend>
      <span aria-hidden="true">{t('Appearance')}</span>
      <div className="chips">
        {CHOICES.map(({ value, label }) => (
          <label key={value} className="chip">
            <input
              type="radio"
              name={name}
              value={value}
              checked={preference === value}
              onChange={() => setPreference(value as ThemePreference)}
            />
            {t(label)}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

import { useId } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';
import { useTheme } from '../theme/ThemeProvider';
import { PALETTES } from '../theme/palettes';
import { haptic } from '../domain/haptics';

/** A two-way switch between the app's color themes, styled like the appearance switch. */
export default function ThemePicker() {
  const { t } = useLanguage();
  const { palette, setPalette, appearance } = useTheme();
  const name = useId();
  return (
    <fieldset className="appearance-settings theme-picker">
      <legend>{t('Theme')}</legend>
      <div className="appearance-options theme-options">
        {PALETTES.map((option) => (
          <label key={option.id} className="theme-option">
            <input
              type="radio"
              name={name}
              value={option.id}
              checked={palette === option.id}
              onChange={() => {
                haptic('select');
                setPalette(option.id);
              }}
            />
            <span
              className="theme-swatch"
              aria-hidden="true"
              style={{ background: option[appearance].tint }}
            />
            <span>{t(option.name)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

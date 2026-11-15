import { useId } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';
import { useTheme } from '../theme/ThemeProvider';
import { PALETTES } from '../theme/palettes';
import { haptic } from '../domain/haptics';
import { Check } from './ui/icons';

/** Every color theme as a two-column list: a swatch of its colors, then its name. */
export default function ThemePicker() {
  const { t } = useLanguage();
  const { palette, setPalette, appearance } = useTheme();
  const name = useId();
  return (
    <fieldset className="theme-picker">
      <legend>{t('Theme')}</legend>
      <div className="theme-options">
        {PALETTES.map((option) => {
          const colors = option[appearance];
          return (
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
              <span className="theme-swatch" aria-hidden="true" style={{ background: colors.bg }}>
                <i style={{ background: colors.hero }} />
              </span>
              <span className="theme-name">{t(option.name)}</span>
              <Check size={15} className="theme-check" aria-hidden="true" />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

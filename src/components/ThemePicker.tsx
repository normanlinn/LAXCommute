import { useId } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';
import { useTheme } from '../theme/ThemeProvider';
import { PALETTES } from '../theme/palettes';
import { haptic } from '../domain/haptics';
import { Check } from './ui/icons';

/** The eight color themes as one compact row of swatches; the chosen name sits beside the title. */
export default function ThemePicker() {
  const { t } = useLanguage();
  const { palette, setPalette, appearance } = useTheme();
  const name = useId();
  const current = PALETTES.find((option) => option.id === palette) ?? PALETTES[0];
  return (
    <fieldset className="theme-picker">
      <legend>
        {t('Theme')}
        <span className="theme-current">{t(current.name)}</span>
      </legend>
      <div className="theme-dots">
        {PALETTES.map((option) => {
          const colors = option[appearance === 'dark' ? 'dark' : 'light'];
          return (
            <label key={option.id} className="theme-dot" title={t(option.name)}>
              <input
                type="radio"
                name={name}
                value={option.id}
                checked={palette === option.id}
                aria-label={t(option.name)}
                onChange={() => {
                  haptic('select');
                  setPalette(option.id);
                }}
              />
              <span
                className="theme-dot-face"
                aria-hidden="true"
                style={{ background: colors.bg, color: colors.tint }}
              >
                <i style={{ background: colors.tint }} />
                <Check size={14} />
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

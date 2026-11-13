import { useId } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';
import { useTheme } from '../theme/ThemeProvider';
import { PALETTES } from '../theme/palettes';
import { haptic } from '../domain/haptics';

/** The eight color themes; each previews its light and dark sides and its accent. */
export default function ThemePicker() {
  const { t } = useLanguage();
  const { palette, setPalette } = useTheme();
  const name = useId();
  return (
    <fieldset className="theme-picker">
      <legend>{t('Theme')}</legend>
      <div className="theme-grid">
        {PALETTES.map((option) => (
          <label key={option.id} className="theme-tile">
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
            <span className="theme-swatch" aria-hidden="true">
              <span style={{ background: option.light.bg }}>
                <i style={{ background: option.light.tint }} />
              </span>
              <span style={{ background: option.dark.bg }}>
                <i style={{ background: option.dark.tint }} />
              </span>
            </span>
            <span className="theme-name">{t(option.name)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

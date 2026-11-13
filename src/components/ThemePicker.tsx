import { useId } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';
import { useTheme } from '../theme/ThemeProvider';
import { PALETTES } from '../theme/palettes';
import { haptic } from '../domain/haptics';
import { Check } from './ui/icons';

type Colors = { bg: string; card: string; tint: string };

/** A tiny screen: the theme background with a card and its accent color. */
function MiniScreen({ colors }: { colors: Colors }) {
  return (
    <span className="theme-mini" style={{ background: colors.bg }}>
      <i style={{ background: colors.card }}>
        <b style={{ background: colors.tint }} />
      </i>
    </span>
  );
}

/** The eight color themes, each previewed in light and dark. */
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
              <MiniScreen colors={option.light} />
              <MiniScreen colors={option.dark} />
            </span>
            <span className="theme-name">{t(option.name)}</span>
            <span className="theme-check" aria-hidden="true">
              <Check size={14} />
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

import { useId, useMemo, useState } from 'react';
import { useLanguage } from '../i18n/LanguageProvider';
import { useTheme, type ThemePreference } from '../theme/ThemeProvider';
import { PALETTES, type PaletteID } from '../theme/palettes';
import { haptic } from '../domain/haptics';
import { Check, Monitor, Moon, Sun } from './ui/icons';

type CategoryKey = 'all' | 'aviation' | 'california' | 'minimal';

const THEME_CATEGORIES: Record<string, CategoryKey> = {
  runway: 'aviation',
  cockpit: 'aviation',
  board: 'aviation',
  modernist: 'aviation',
  sunset: 'california',
  golden: 'california',
  pacific: 'california',
  hollywood: 'california',
  palm: 'california',
  rose: 'california',
  ember: 'minimal',
  apple: 'minimal',
  nordic: 'minimal',
  ocean: 'minimal',
  matcha: 'minimal',
  lavender: 'minimal',
};

const CATEGORIES: { id: CategoryKey; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'aviation', label: 'Aviation & LAX' },
  { id: 'california', label: 'California Skies' },
  { id: 'minimal', label: 'Studio & Minimal' },
];

const APPEARANCE_CHOICES: { value: ThemePreference; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: 'System', Icon: Monitor },
  { value: 'light', label: 'Light', Icon: Sun },
  { value: 'dark', label: 'Dark', Icon: Moon },
];

/** Modern theme gallery with interactive live preview and aviation/LA collections. */
export default function ThemePicker() {
  const { t } = useLanguage();
  const { palette, setPalette, appearance, preference, setPreference } = useTheme();
  const name = useId();
  const [category, setCategory] = useState<CategoryKey>('all');
  const [previewId, setPreviewId] = useState<PaletteID | null>(null);

  const activeOption = useMemo(
    () => PALETTES.find((p) => p.id === (previewId || palette)) || PALETTES[0],
    [previewId, palette],
  );
  const previewColors = activeOption[appearance];

  const visiblePalettes = useMemo(() => {
    if (category === 'all') return PALETTES;
    return PALETTES.filter((p) => THEME_CATEGORIES[p.id] === category);
  }, [category]);

  return (
    <fieldset className="theme-picker">
      <legend>{t('Theme')}</legend>

      {/* Interactive live preview card */}
      <div
        className="theme-preview-card"
        style={{
          background: previewColors.card,
          borderColor: previewColors.tint,
        }}
        aria-hidden="true"
      >
        <div className="theme-preview-head">
          <span className="theme-preview-tag">{t('Live preview')}</span>
          <span className="theme-preview-active-name" style={{ color: previewColors.tint }}>
            {t(activeOption.name)}
          </span>
        </div>
        <div
          className="theme-preview-hero"
          style={{
            background: previewColors.hero,
            color: '#ffffff',
          }}
        >
          <div
            className="theme-preview-badge"
            style={{
              background: '#ffffff',
              color: previewColors.hero,
            }}
          >
            S
          </div>
          <div className="theme-preview-info">
            <strong>{t('{lot} shuttle', { lot: 'South' })}</strong>
            <small>{t('to {place}', { place: 'Terminal B (TBIT)' })}</small>
          </div>
          <div className="theme-preview-time">
            <strong>4</strong>
            <small>{t('min')}</small>
          </div>
        </div>
        <div className="theme-preview-foot">
          <span className="theme-preview-status">
            <i className="live-dot" />
            {t('Live')} · ~5:24 PM
          </span>
          <span
            className="theme-preview-badge-mini"
            style={{
              background: previewColors.bg,
              color: previewColors.tint,
            }}
          >
            LAXCommute
          </span>
        </div>
      </div>

      {/* Appearance quick toggle */}
      <div className="theme-appearance-bar" role="group" aria-label={t('Appearance')}>
        {APPEARANCE_CHOICES.map(({ value, label, Icon }) => (
          <button
            key={value}
            type="button"
            className={`chip ${preference === value ? 'is-active' : ''}`}
            aria-pressed={preference === value}
            onClick={() => {
              haptic('tap');
              setPreference(value);
            }}
          >
            <Icon size={14} aria-hidden="true" />
            <span>{t(label)}</span>
          </button>
        ))}
      </div>

      {/* Category filter tabs */}
      <div className="theme-categories" role="tablist" aria-label={t('Theme')}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            role="tab"
            className={`chip ${category === cat.id ? 'is-active' : ''}`}
            aria-selected={category === cat.id}
            onClick={() => {
              haptic('tap');
              setCategory(cat.id);
            }}
          >
            {t(cat.label)}
          </button>
        ))}
      </div>

      {/* Palette choices */}
      <div className="theme-options">
        {visiblePalettes.map((option) => {
          const colors = option[appearance];
          const isSelected = palette === option.id;
          return (
            <label
              key={option.id}
              className={`theme-option ${isSelected ? 'is-checked' : ''}`}
              onPointerEnter={() => setPreviewId(option.id)}
              onPointerLeave={() => setPreviewId(null)}
            >
              <input
                type="radio"
                name={name}
                value={option.id}
                checked={isSelected}
                onChange={() => {
                  haptic('select');
                  setPalette(option.id);
                }}
              />
              <span
                className="theme-swatch"
                aria-hidden="true"
                style={{
                  background: colors.bg,
                }}
              >
                <span className="theme-swatch-inner" style={{ background: colors.card }}>
                  <i style={{ background: colors.hero }} />
                </span>
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

import { createContext, useContext, useEffect, useState } from 'react';
import {
  DEFAULT_PALETTE,
  PALETTES,
  PALETTE_STORAGE_KEY,
  isPaletteID,
  type PaletteID,
} from './palettes';

export type ThemePreference = 'system' | 'light' | 'dark';
export const THEME_STORAGE_KEY = 'laxcommute:theme';
const ThemeContext = createContext({
  preference: 'system' as ThemePreference,
  appearance: 'light' as 'light' | 'dark',
  setPreference: (_value: ThemePreference) => {},
  palette: DEFAULT_PALETTE as PaletteID,
  setPalette: (_value: PaletteID) => {},
});
function saved<T>(key: string, accept: (value: unknown) => value is T, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return accept(value) ? value : fallback;
  } catch {
    return fallback;
  }
}
const isPreference = (value: unknown): value is ThemePreference =>
  value === 'light' || value === 'dark';
function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Appearance still works when the browser blocks storage.
  }
}
// Crossfade theme changes where the browser supports view transitions.
function transition(change: () => void) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const start = (document as Document & { startViewTransition?: (cb: () => void) => unknown })
    .startViewTransition;
  if (reduce || !start) change();
  else start.call(document, change);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, updatePreference] = useState(() =>
    saved(THEME_STORAGE_KEY, isPreference, 'system' as ThemePreference),
  );
  const [palette, updatePalette] = useState(() =>
    saved(PALETTE_STORAGE_KEY, isPaletteID, DEFAULT_PALETTE),
  );
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  );
  const appearance = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!query) return;
    const change = () => setSystemDark(query.matches);
    change();
    query.addEventListener?.('change', change);
    return () => query.removeEventListener?.('change', change);
  }, []);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = appearance === 'dark' ? 'lax-dark' : 'lax';
    root.dataset.palette = palette;
    root.style.colorScheme = appearance;
    const colors = PALETTES.find((p) => p.id === palette)![appearance];
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors.bg);
  }, [appearance, palette]);
  function setPreference(value: ThemePreference) {
    transition(() => updatePreference(value));
    store(THEME_STORAGE_KEY, value);
  }
  function setPalette(value: PaletteID) {
    transition(() => updatePalette(value));
    store(PALETTE_STORAGE_KEY, value);
  }
  return (
    <ThemeContext.Provider value={{ preference, appearance, setPreference, palette, setPalette }}>
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);

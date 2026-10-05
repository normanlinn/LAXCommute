import { createContext, useContext, useEffect, useState } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';
export const THEME_STORAGE_KEY = 'laxcommute:theme';
const ThemeContext = createContext({
  preference: 'system' as ThemePreference,
  appearance: 'light' as 'light' | 'dark',
  setPreference: (_value: ThemePreference) => {},
});
function savedPreference(): ThemePreference {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, updatePreference] = useState(savedPreference);
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
    document.documentElement.dataset.theme = appearance === 'dark' ? 'lax-dark' : 'lax';
    document.documentElement.style.colorScheme = appearance;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', appearance === 'dark' ? '#101c16' : '#f5f7f6');
  }, [appearance]);
  function setPreference(value: ThemePreference) {
    updatePreference(value);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, value);
    } catch {
      // Appearance still works when the browser blocks storage.
    }
  }
  return (
    <ThemeContext.Provider value={{ preference, appearance, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}
export const useTheme = () => useContext(ThemeContext);

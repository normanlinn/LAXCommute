import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import myanmar from './my.json';
import spanish from './es.json';

export type Language = 'en' | 'my' | 'es';
type Variables = Record<string, string | number>;
export const LANGUAGE_STORAGE_KEY = 'laxcommute:language';
const messages: Record<string, Record<string, string>> = { my: myanmar, es: spanish };
export function translate(language: Language, message: string, variables: Variables = {}) {
  const template = messages[language]?.[message] || message;
  return template.replace(/\{(\w+)\}/g, (original, key: string) =>
    Object.hasOwn(variables, key) ? String(variables[key]) : original,
  );
}
const english = {
  language: 'en' as Language,
  setLanguage: (_language: Language) => {},
  t: (message: string, variables?: Variables) => translate('en', message, variables),
};
const LanguageContext = createContext(english);
function savedLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return stored === 'my' || stored === 'es' ? stored : 'en';
  } catch {
    return 'en';
  }
}
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, updateLanguage] = useState<Language>(savedLanguage);
  const setLanguage = useCallback((next: Language) => {
    updateLanguage(next);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
    } catch {
      // Switching still works if browser storage is unavailable.
    }
  }, []);
  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t: (message: string, variables?: Variables) => translate(language, message, variables),
    }),
    [language, setLanguage],
  );
  useEffect(() => {
    document.documentElement.lang = language;
    document.title = value.t('LAX Employee Shuttle Tracker | South, East & West Lots | LAXCommute');
  }, [language, value]);
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
export function useLanguage() {
  return useContext(LanguageContext);
}

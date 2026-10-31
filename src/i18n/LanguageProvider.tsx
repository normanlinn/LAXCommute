import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'en' | 'my' | 'es';
type Variables = Record<string, string | number>;
export const LANGUAGE_STORAGE_KEY = 'laxcommute:language';
// Each rider needs one language, so the others stay out of the startup bundle.
const loaders = {
  my: () => import('./my.json'),
  es: () => import('./es.json'),
};
const messages: Partial<Record<Language, Record<string, string>>> = {};
export async function loadMessages(language: Language) {
  if (language === 'en' || messages[language]) return;
  try {
    messages[language] = (await loaders[language]()).default;
  } catch {
    // Offline before this language was cached: English text still works.
  }
}
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
export function savedLanguage(): Language {
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
    const apply = () => {
      updateLanguage(next);
      try {
        localStorage.setItem(LANGUAGE_STORAGE_KEY, next);
      } catch {
        // Switching still works if browser storage is unavailable.
      }
    };
    // Switch only once the text is here, so the screen never flashes English.
    if (next === 'en' || messages[next]) apply();
    else void loadMessages(next).then(apply);
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

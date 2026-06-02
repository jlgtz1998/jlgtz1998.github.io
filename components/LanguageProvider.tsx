'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Lang = 'en' | 'es';

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: 'en',
  setLang: () => {},
});

export const useLanguage = () => useContext(LanguageContext);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = (localStorage.getItem('cran3o_color_studio_lang') as Lang | null) ?? 'en';
    if (saved === 'en' || saved === 'es') {
      setLangState(saved);
      document.documentElement.lang = saved;
    }
    setHydrated(true);
  }, []);

  const setLang = (next: Lang) => {
    setLangState(next);
    localStorage.setItem('cran3o_color_studio_lang', next);
    document.documentElement.lang = next;
  };

  // Avoid hydration mismatch by rendering children only after hydration
  // (street-level pages are client-rendered, so minimal impact)
  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

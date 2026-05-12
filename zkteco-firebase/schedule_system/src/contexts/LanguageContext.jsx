import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import en from '../locales/en.json';
import ar from '../locales/ar.json';

const translations = { en, ar };

const LanguageContext = createContext();

export const useTranslation = () => {
  return useContext(LanguageContext);
};

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => {
    return localStorage.getItem('language') || 'en';
  });

  useEffect(() => {
    localStorage.setItem('language', lang);
    const dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key) => {
    return translations[lang][key] || key;
  };

  const toggleLanguage = () => {
    setLang((prev) => (prev === 'en' ? 'ar' : 'en'));
  };

  const value = useMemo(() => ({ lang, t, toggleLanguage }), [lang]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

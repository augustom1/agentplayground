"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { type Locale, type TranslationKey, translations } from "@/lib/i18n";

interface LanguageContextValue {
  locale: Locale;
  toggle: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  locale: "en",
  toggle: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>("en");

  useEffect(() => {
    const stored = localStorage.getItem("locale") as Locale | null;
    if (stored === "en" || stored === "es") setLocale(stored);
  }, []);

  function toggle() {
    const next: Locale = locale === "en" ? "es" : "en";
    setLocale(next);
    localStorage.setItem("locale", next);
  }

  function t(key: TranslationKey): string {
    return translations[locale][key] ?? translations.en[key] ?? key;
  }

  return (
    <LanguageContext.Provider value={{ locale, toggle, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

import { InitOptions } from "i18next"

export const defaultI18nOptions: InitOptions = {
  debug: process.env.NODE_ENV === "development",
  // Pagly: the language picked in Profile wins; with none yet, the browser's
  // language when the dashboard has it, and Spanish otherwise; a text Spanish
  // lacks still reads in English, the full catalogue. ("header" is a
  // server-side detector: in the browser it never read anything.)
  detection: {
    caches: ["cookie", "localStorage"],
    lookupCookie: "lng",
    lookupLocalStorage: "lng",
    order: ["cookie", "localStorage", "navigator"],
  },
  fallbackLng: ["es", "en"],
  fallbackNS: "translation",
  interpolation: {
    escapeValue: false,
  },
}

// Stand-ins with today's behaviour, replaced in the next commit.
import LanguageDetector from "i18next-browser-languagedetector"
import type { i18n as I18n } from "i18next"

export const createLanguageDetector = () =>
  new LanguageDetector(null, { lookupCookie: "lng", lookupLocalStorage: "lng" })

export const saveLanguage = (_i18n: I18n, _code: string) => {}

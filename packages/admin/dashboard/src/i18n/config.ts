import type { i18n as I18n, InitOptions } from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"

/**
 * Pagly: the admin's languages. The other catalogues are upstream's and lack
 * Pagly's own texts, so they aren't offered; a browser in any other language
 * reads Spanish.
 */
export const SUPPORTED_LANGUAGES = ["es", "en"]

const LANGUAGE_CACHES = ["cookie", "localStorage"]

/** The first of the browser's languages Pagly supports, by base language. */
const browserLanguage = {
  name: "paglyBrowser",
  lookup: () => {
    const tags = navigator.languages?.length
      ? navigator.languages
      : [navigator.language]

    return tags
      .map((tag) => tag?.toLowerCase().split("-")[0])
      .find((code) => code && SUPPORTED_LANGUAGES.includes(code))
  },
}

export const createLanguageDetector = () => {
  const detector = new LanguageDetector(null, {
    lookupCookie: "lng",
    lookupLocalStorage: "lng",
  })
  detector.addDetector(browserLanguage)

  return detector
}

/** Remembers a language the merchant picked (Profile); guesses aren't saved. */
export const saveLanguage = (i18n: Pick<I18n, "services">, code: string) => {
  i18n.services.languageDetector?.cacheUserLanguage?.(code, LANGUAGE_CACHES)
}

export const defaultI18nOptions: InitOptions = {
  debug: process.env.NODE_ENV === "development",
  // Pagly: Profile's choice (cookie, localStorage) wins; with none, the
  // browser's language when Pagly supports it, and Spanish otherwise; a text
  // Spanish lacks still reads in English, the full catalogue. Nothing is
  // saved on its own, so a guess never outlives a fix ("header" was a
  // server-side detector: in the browser it never read anything).
  detection: {
    caches: [],
    lookupCookie: "lng",
    lookupLocalStorage: "lng",
    order: ["cookie", "localStorage", browserLanguage.name],
  },
  fallbackLng: ["es", "en"],
  fallbackNS: "translation",
  interpolation: {
    escapeValue: false,
  },
}

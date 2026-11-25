// @vitest-environment jsdom
import { createInstance } from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { afterEach, describe, expect, it, vi } from "vitest"

import { defaultI18nOptions } from "../config"

/**
 * Pagly: a merchant who opens the admin in a browser that hasn't picked a
 * language yet sees it in their browser's language when the dashboard has
 * it, and in Spanish otherwise. Never English by default.
 */

const resources = {
  en: { translation: { hello: "Hello", onlyEnglish: "Not translated yet" } },
  es: { translation: { hello: "Hola" } },
  pt: { translation: { hello: "Olá" } },
}

const start = async (browserLanguages: string[]) => {
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue(
    browserLanguages
  )
  vi.spyOn(window.navigator, "language", "get").mockReturnValue(
    browserLanguages[0] ?? ""
  )

  const i18n = createInstance()
  await i18n
    .use(
      new LanguageDetector(null, {
        lookupCookie: "lng",
        lookupLocalStorage: "lng",
      })
    )
    .init({
      ...defaultI18nOptions,
      debug: false,
      resources,
      supportedLngs: Object.keys(resources),
    })

  return i18n
}

// The dashboard types `t` to its own keys; a text no catalogue has reads "(missing)".
const text = (i18n: Awaited<ReturnType<typeof start>>, key: string) =>
  i18n.t(key, { defaultValue: "(missing)" })

const clearChoice = () => {
  document.cookie = "lng=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"
  window.localStorage.clear()
}

describe("the admin's first language", () => {
  afterEach(() => {
    vi.restoreAllMocks()
    clearChoice()
  })

  it("follows a Spanish browser, regional variant included", async () => {
    const i18n = await start(["es-UY", "es"])

    expect(i18n.resolvedLanguage).toBe("es")
  })

  it("follows a browser in another language the dashboard has", async () => {
    expect((await start(["pt-BR"])).resolvedLanguage).toBe("pt")
    clearChoice()
    expect((await start(["en-US", "en"])).resolvedLanguage).toBe("en")
  })

  it("is Spanish when the browser's language isn't one the dashboard has", async () => {
    const i18n = await start(["ja-JP"])

    expect(i18n.resolvedLanguage).toBe("es")
    expect(text(i18n, "hello")).toBe("Hola")
  })

  it("still shows English for a text Spanish doesn't have yet", async () => {
    const i18n = await start(["es-UY"])

    expect(text(i18n, "onlyEnglish")).toBe("Not translated yet")
  })

  it("keeps the language the merchant chose in Profile", async () => {
    document.cookie = "lng=en; path=/"

    expect((await start(["es-UY"])).resolvedLanguage).toBe("en")
  })
})

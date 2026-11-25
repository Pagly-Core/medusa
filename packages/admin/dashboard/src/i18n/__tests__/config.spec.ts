// @vitest-environment jsdom
import { createInstance } from "i18next"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  createLanguageDetector,
  defaultI18nOptions,
  saveLanguage,
} from "../config"
import translations from "../translations"

/**
 * Pagly: a merchant who opens the admin in a browser that hasn't picked a
 * language yet sees it in their browser's language when Pagly keeps that
 * catalogue complete (Spanish, English), and in Spanish otherwise. Never
 * English by default. Only a choice made in Profile is remembered.
 */

// The dashboard's own codes (`ptBR`, `enGB`, `zhCN`…); every catalogue but
// English lacks a text, as the upstream ones lack Pagly's.
const resources = Object.fromEntries(
  Object.keys(translations).map((code) => [
    code,
    {
      translation:
        code === "en"
          ? { hello: "en", onlyEnglish: "Not translated yet" }
          : { hello: code },
    },
  ])
)

const start = async (browserLanguages: string[]) => {
  vi.spyOn(window.navigator, "languages", "get").mockReturnValue(
    browserLanguages
  )
  vi.spyOn(window.navigator, "language", "get").mockReturnValue(
    browserLanguages[0] ?? ""
  )

  const i18n = createInstance()
  await i18n.use(createLanguageDetector()).init({
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

const saved = () => ({
  cookie: document.cookie.match(/(?:^|; )lng=([^;]*)/)?.[1],
  localStorage: window.localStorage.getItem("lng"),
})

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
    expect((await start(["es-UY", "es"])).resolvedLanguage).toBe("es")
  })

  it("follows an English browser, British included", async () => {
    expect((await start(["en-US", "en"])).resolvedLanguage).toBe("en")
    expect((await start(["en-GB"])).resolvedLanguage).toBe("en")
  })

  it("is Spanish for a browser in a language Pagly doesn't keep complete", async () => {
    for (const browser of [
      ["de-DE", "de"],
      ["pt-BR", "pt"],
      ["zh-CN"],
      ["ja-JP"],
    ]) {
      const i18n = await start(browser)

      expect(i18n.resolvedLanguage).toBe("es")
      expect(text(i18n, "hello")).toBe("es")
    }
  })

  it("takes the first browser language Pagly keeps", async () => {
    expect((await start(["de-DE", "en-US", "es"])).resolvedLanguage).toBe(
      "en"
    )
  })

  it("still shows English for a text Spanish doesn't have yet", async () => {
    const i18n = await start(["es-UY"])

    expect(text(i18n, "onlyEnglish")).toBe("Not translated yet")
  })

  it("remembers nothing it only guessed from the browser", async () => {
    await start(["es-UY"])

    expect(saved()).toEqual({ cookie: undefined, localStorage: null })
  })

  it("keeps the language the merchant chose in Profile, any of the dashboard's", async () => {
    const first = await start(["es-UY"])
    await first.changeLanguage("ptBR")
    saveLanguage(first, "ptBR")

    expect(saved()).toEqual({ cookie: "ptBR", localStorage: "ptBR" })
    expect((await start(["es-UY"])).resolvedLanguage).toBe("ptBR")
  })
})

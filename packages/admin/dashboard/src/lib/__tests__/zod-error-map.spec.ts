import i18n from "i18next"
import { beforeAll, describe, expect, it, vi } from "vitest"
import { z } from "zod"

import en from "../../i18n/translations/en.json"
import es from "../../i18n/translations/es.json"

vi.hoisted(() => {
  const g = global as any
  g.__BACKEND_URL__ = "http://localhost:9000"
  g.__AUTH_TYPE__ = "session"
  g.__JWT_TOKEN_STORAGE_KEY__ = ""
})

// The admin's i18n setup, which every page loads before a form runs.
import "../../components/utilities/i18n/i18n"

const messageOf = (schema: z.ZodType, input: unknown) => {
  const result = schema.safeParse(input)
  return result.success ? undefined : result.error.issues[0].message
}

beforeAll(async () => {
  await i18n.init({
    lng: "es",
    fallbackLng: "en",
    resources: { es: { translation: es }, en: { translation: en } },
  })
})

// Pagly-Core/pagly-app#356: most forms said zod's own "Invalid input" or
// "Too small: expected string to have >=1 characters", in English.
describe("validation messages", () => {
  it("says an empty required field is required", () => {
    expect(messageOf(z.object({ name: z.string().min(1) }), { name: "" })).toBe(
      "Obligatorio"
    )
    expect(messageOf(z.object({ name: z.string() }), {})).toBe("Obligatorio")
    expect(messageOf(z.array(z.string()).min(1), [])).toBe("Obligatorio")
  })

  it("says a malformed email is not an email", () => {
    expect(messageOf(z.string().email(), "ana@")).toBe("Email inválido")
  })

  it("says the bounds of a number and a text", () => {
    expect(messageOf(z.number().min(5), 2)).toBe("Ingresá 5 o más.")
    expect(messageOf(z.number().max(100), 150)).toBe("Ingresá 100 o menos.")
    expect(messageOf(z.string().min(3), "ab")).toBe(
      "Ingresá al menos 3 caracteres."
    )
  })

  it("says anything else is not valid, never zod's English", () => {
    expect(messageOf(z.enum(["a", "b"]), "c")).toBe("Ese valor no es válido.")
  })

  it("reads the admin's language when the form is checked", async () => {
    await i18n.changeLanguage("en")
    try {
      expect(messageOf(z.string().min(1), "")).toBe("Required")
    } finally {
      await i18n.changeLanguage("es")
    }
  })

  it("keeps a schema's own message", () => {
    expect(messageOf(z.string().min(1, "Poné un nombre"), "")).toBe(
      "Poné un nombre"
    )
  })
})

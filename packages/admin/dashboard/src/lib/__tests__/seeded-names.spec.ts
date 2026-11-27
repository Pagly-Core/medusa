import { describe, expect, test } from "vitest"

import en from "../../i18n/translations/en.json"
import es from "../../i18n/translations/es.json"
import {
  seededName,
  shippingOptionTypeDescription,
  shippingOptionTypeLabel,
} from "../seeded-names"

// A t() that reads one catalog, enough for these labels.
const tFor =
  (catalog: Record<string, any>) =>
  (key: string): string =>
    key.split(".").reduce((node, part) => node?.[part], catalog) ?? key

const t = tFor(es)

describe("seeded names", () => {
  test("the shipping profile Medusa seeds reads in Spanish", () => {
    expect(seededName(t, "Default Shipping Profile")).toBe("Perfil general")
    expect(seededName(t, " default shipping profile ")).toBe("Perfil general")
  })

  test("the sales channel Medusa seeds reads in Spanish", () => {
    expect(seededName(t, "Default Sales Channel")).toBe(
      "Canal de venta predeterminado"
    )
  })

  test("a name the merchant chose stays as written", () => {
    expect(seededName(t, "Envíos pesados")).toBe("Envíos pesados")
    expect(seededName(t, "Default")).toBe("Default")
    expect(seededName(t, undefined)).toBe("")
  })

  test("the standard shipping option type reads in Spanish", () => {
    const type = {
      code: "standard",
      label: "Standard",
      description: "Standard delivery",
    }
    expect(shippingOptionTypeLabel(t, type)).toBe("Estándar")
    expect(shippingOptionTypeDescription(t, type)).toBe("Entrega estándar")
  })

  test("a shipping option type the merchant named stays as written", () => {
    const own = { code: "standard", label: "Común", description: "En 48 h" }
    expect(shippingOptionTypeLabel(t, own)).toBe("Común")
    expect(shippingOptionTypeDescription(t, own)).toBe("En 48 h")
    const other = { code: "express", label: "Standard", description: null }
    expect(shippingOptionTypeLabel(t, other)).toBe("Standard")
    expect(shippingOptionTypeDescription(t, other)).toBe("")
  })

  test("English keeps readable names", () => {
    expect(seededName(tFor(en), "Default Shipping Profile")).toBe(
      "General profile"
    )
  })
})

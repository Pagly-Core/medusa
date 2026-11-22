import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import en from "../../../../../../i18n/translations/en.json"
import es from "../../../../../../i18n/translations/es.json"

// Pagly: the product page's Envío card shows the weight in kilos and the
// sides in centimetres, and its pencil opens this form, which stores grams
// and centimetres. Each field says its unit, so a merchant doesn't type
// kilos where grams go.
const FORM = readFileSync(
  path.resolve(__dirname, "../product-attributes-form.tsx"),
  "utf8"
)

const UNIT_KEYS = {
  "products.page.shipping.widthCm": "Ancho (cm)",
  "products.page.shipping.heightCm": "Alto (cm)",
  "products.page.shipping.lengthCm": "Largo (cm)",
  "products.page.shipping.weightGrams": "Peso (g)",
}

const read = (catalog: Record<string, any>, key: string) =>
  key.split(".").reduce<any>((node, part) => node?.[part], catalog)

describe("the attributes form's units", () => {
  it.each(Object.keys(UNIT_KEYS))("labels a measure with its unit: %s", (key) => {
    expect(FORM).toContain(`t("${key}")`)
  })

  it("says the units in both languages", () => {
    for (const [key, spanish] of Object.entries(UNIT_KEYS)) {
      expect(typeof read(en, key), key).toBe("string")
      expect(read(es, key)).toBe(spanish)
    }
  })
})

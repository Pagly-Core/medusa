import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vitest"

import en from "../en.json"
import es from "../es.json"

/**
 * Pagly: a product's type is named "Tipo de producto" wherever the product
 * screens show it, so it is not read as any other kind of type. The generic
 * `fields.type` stays "Tipo" for shipping profiles, API keys and price lists.
 */
type Copy = {
  products: { fields: { type: { label: string } } }
  fields: { type: string; product_types: string }
  app: { search: { groups: { productType: string; product_type: string } } }
}

const copy = (catalog: unknown) => catalog as Copy

const SRC = join(__dirname, "..", "..", "..")

/** The product screens that label a product's type. */
const PRODUCT_TYPE_SCREENS = [
  "routes/products/product-detail/components/product-organization-section/product-organization-section.tsx",
  "routes/products/product-list/components/product-list-table/use-product-table-filters.tsx",
  "hooks/table/filters/use-product-table-filters.tsx",
  "routes/products/product-create/components/product-create-organize-form/components/product-create-organize-section/product-create-details-organize-section.tsx",
  "routes/products/product-organization/components/product-organization-form/product-organization-form.tsx",
]

describe("product type copy", () => {
  test("Spanish names it Tipo de producto, in sentence case", () => {
    expect(copy(es).products.fields.type.label).toBe("Tipo de producto")
    expect(copy(es).fields.product_types).toBe("Tipos de producto")
    expect(copy(es).app.search.groups.productType).toBe("Tipos de producto")
    expect(copy(es).app.search.groups.product_type).toBe("Tipos de producto")
  })

  test("English names it Product type", () => {
    expect(copy(en).products.fields.type.label).toBe("Product type")
  })

  test("the generic Tipo stays for the other screens", () => {
    expect(copy(es).fields.type).toBe("Tipo")
    expect(copy(en).fields.type).toBe("Type")
  })

  test.each(PRODUCT_TYPE_SCREENS)("%s labels the type with the product key", (file) => {
    const source = readFileSync(join(SRC, file), "utf8")
    expect(source).toContain('t("products.fields.type.label")')
    expect(source).not.toContain('t("fields.type")')
  })
})

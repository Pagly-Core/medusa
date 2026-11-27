import fs from "fs"
import path from "path"
import { describe, expect, test } from "vitest"

import en from "../en.json"
import es from "../es.json"

/**
 * Pagly: every Spanish string reads in Spanish. A value left identical to the
 * English one is a missed translation unless it is the same word in both
 * languages (Total, Stock), a code or acronym (SKU, JSON) or only
 * placeholders. Those are listed here; anything new fails.
 */

function flatten(value: unknown, prefix = ""): [string, string][] {
  if (typeof value === "string") {
    return [[prefix, value]]
  }
  if (!value || typeof value !== "object") {
    return []
  }
  return Object.entries(value).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key)
  )
}

const SAME_IN_BOTH = new Set([
  "$schema",
  "filters.radio.no",
  "fields.id",
  "products.page.shipping.sizesValue",
  "campaigns.budget.attribute.customer_email",
  "general.original",
  "general.error",
  "general.global",
  "json.header",
  "app.nav.settings.storeGeneral",
  "layout.personalView",
  "dataGrid.errors.count_one",
  "products.create.header",
  "products.fields.material.label",
  "products.fields.options.optionTitlePlaceholder",
  "products.page.variants.columns.sku",
  "products.page.variants.columns.stock",
  "products.page.variants.stock",
  "products.page.variants.sku",
  "customers.export.format.json",
  "customers.export.format.csv",
  "orders.summary.subtotal",
  "orders.summary.total",
  "taxRegions.fields.isCombinable.label",
  "taxRegions.fields.isCombinable.true",
  "roles.domain",
  "policies.fields.roles",
  "returnReasons.fields.value.placeholder",
  "workflowExecutions.history.errorLabel",
  "searchIndexes.status.error",
  "fields.normal",
  "fields.subtotal",
  "fields.ean",
  "fields.upc",
  "fields.material",
  "fields.sku",
])

const flatEn = new Map(flatten(en))
const onlyPlaceholders = (value: string) =>
  !/[a-z]{2,}/i.test(value.replace(/\{\{[^}]*\}\}|<\/?\d+>/g, ""))

describe("es.json has no English left", () => {
  test("no value is still the English one", () => {
    const leftovers = flatten(es)
      .filter(([key, value]) => flatEn.get(key) === value)
      .filter(([key, value]) => !SAME_IN_BOTH.has(key) && !onlyPlaceholders(value))
      .map(([key, value]) => `${key}: ${value}`)

    expect(leftovers).toEqual([])
  })

  test("a handle is an identificador, not a literal translation", () => {
    const literal = flatten(es)
      .filter(([, value]) => /\bmanej(o|ador)\b/i.test(value))
      .map(([key]) => key)

    expect(literal).toEqual([])
  })

  test("the rows Medusa seeds have Spanish names", () => {
    expect(es.defaultNames).toEqual({
      shippingProfile: "Perfil general",
      salesChannel: "Canal de venta predeterminado",
      shippingOptionType: {
        label: "Estándar",
        description: "Envío o retiro con precio fijo",
      },
    })
  })
})

// Literals that showed English on a Spanish admin, each now read from the
// catalogs.
const HARDCODED = [
  ["routes/promotions/promotion-detail/components/campaign-section/campaign-section.tsx", ["Not part of a campaign", "Add this promotion to an existing campaign", "Add to Campaign"]],
  ["routes/price-lists/price-list-prices-add/components/price-list-prices-add-form/price-list-prices-add-product-ids-form.tsx", ["This product is already in the price list", "This product has no variants"]],
  ["routes/inventory/inventory-create/components/inventory-create-form/inventory-create-form.tsx", ["The item description"]],
  ["routes/promotions/common/edit-rules/components/rules-form-field/rules-form-field.tsx", ["Select Operator"]],
  ["routes/reservations/reservation-detail/components/reservation-general-section/reservation-general-section.tsx", ["Loading..."]],
  ["routes/roles/role-permissions/components/edit-role-permissions-form/edit-role-permissions-form.tsx", ["Unknown error"]],
  ["routes/translations/translations-edit/components/translations-edit-form/translations-edit-form.tsx", ["Failed to save translations"]],
] as const

describe("no hardcoded English", () => {
  const src = path.join(__dirname, "../../..")

  test.each(HARDCODED)("%s", (file, literals) => {
    const code = fs.readFileSync(path.join(src, file), "utf8")
    expect(literals.filter((literal) => code.includes(literal))).toEqual([])
  })
})

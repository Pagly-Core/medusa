// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { existsSync, readdirSync, readFileSync } from "fs"
import { createInstance } from "i18next"
import path from "path"
import { ReactNode } from "react"
import { I18nextProvider } from "react-i18next"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it } from "vitest"

import en from "../../../../i18n/translations/en.json"
import es from "../../../../i18n/translations/es.json"
import { NoRecords } from "../../empty-table-content"
import { EmptyState } from "../empty-state"
import { EMPTY_STATE_KINDS, EMPTY_STATES } from "../registry"

/**
 * Pagly: an empty list page shows a drawing of what it holds, a title, one
 * sentence and its action, instead of "No hay registros". The plugin's pages
 * use the same component (`@pagly/storefront` admin, components/empty-state).
 */

const SRC = path.resolve(__dirname, "../../../..")
const KINDS_DIR = path.resolve(__dirname, "../kinds")

/** Where each list page draws its empty state, relative to the dashboard's src. */
const PAGES: Record<string, string> = {
  orders: "routes/orders/order-list/components/order-list-table/order-list-table.tsx",
  draftOrders: "../../../plugins/draft-order/src/admin/routes/draft-orders/page.tsx",
  products: "routes/products/product-list/components/product-list-table/product-list-table.tsx",
  collections: "routes/collections/collection-list/components/collection-list-table/collection-list-table.tsx",
  categories: "routes/categories/category-list/components/category-list-table/category-list-table.tsx",
  productOptions: "routes/product-options/product-option-list/components/product-option-list-table/product-option-list-table.tsx",
  productTypes: "routes/product-types/product-type-list/components/product-type-list-table/product-type-list-table.tsx",
  productTags: "routes/product-tags/product-tag-list/components/product-tag-list-table/product-tag-list-table.tsx",
  inventory: "routes/inventory/inventory-list/components/inventory-list-table.tsx",
  reservations: "routes/reservations/reservation-list/components/reservation-list-table/reservation-list-table.tsx",
  customers: "routes/customers/customer-list/components/customer-list-table/customer-list-table.tsx",
  customerGroups: "routes/customer-groups/customer-group-list/components/customer-group-list-table/customer-group-list-table.tsx",
  promotions: "routes/promotions/promotion-list/components/promotion-list-table/promotion-list-table.tsx",
  campaigns: "routes/campaigns/campaign-list/components/campaign-list-table.tsx",
  priceLists: "routes/price-lists/price-list-list/components/price-list-list-table/price-list-list-table.tsx",
  locations: "routes/locations/location-list/location-list-table.tsx",
  shippingProfiles: "routes/shipping-profiles/shipping-profiles-list/components/shipping-profile-list-table/shipping-profile-list-table.tsx",
  shippingOptionTypes: "routes/shipping-option-types/shipping-option-type-list/components/shipping-option-type-list-table/shipping-option-type-list-table.tsx",
  regions: "routes/regions/region-list/components/region-list-table/region-list-table.tsx",
  taxRegions: "routes/tax-regions/tax-region-list/components/tax-region-list-view/tax-region-list-view.tsx",
  salesChannels: "routes/sales-channels/sales-channel-list/components/sales-channel-list-table.tsx",
  returnReasons: "routes/return-reasons/return-reason-list/components/return-reason-list-table/return-reason-list-table.tsx",
  refundReasons: "routes/refund-reasons/refund-reason-list/components/refund-reason-list-table/refund-reason-list-table.tsx",
  apiKeys: "routes/api-key-management/api-key-management-list/components/api-key-management-list-table/api-key-management-list-table.tsx",
  workflows: "routes/workflow-executions/workflow-execution-list/components/workflow-execution-list-table/workflow-execution-list-table.tsx",
}

const kebab = (kind: string) => kind.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

const lookup = (catalog: unknown, key: string): unknown =>
  key.split(".").reduce<unknown>((node, part) => (node && typeof node === "object" ? (node as Record<string, unknown>)[part] : undefined), catalog)

const words = (value: string) => value.trim().split(/\s+/).filter(Boolean)

const renderIn = async (ui: ReactNode, lng = "es") => {
  const i18n = createInstance()
  await i18n.init({ lng, resources: { en: { translation: en }, es: { translation: es } } })
  return render(
    <I18nextProvider i18n={i18n as never}>
      <MemoryRouter>{ui}</MemoryRouter>
    </I18nextProvider>
  )
}

afterEach(() => cleanup())

describe("the empty-state registry", () => {
  it("lists every core list page", () => {
    expect([...EMPTY_STATE_KINDS].sort()).toEqual(Object.keys(PAGES).sort())
  })

  it("has one module per kind and none left over", () => {
    const modules = existsSync(KINDS_DIR) ? readdirSync(KINDS_DIR).filter((name) => name.endsWith(".tsx")) : []
    expect(modules.sort()).toEqual(Object.keys(PAGES).map((kind) => `${kebab(kind)}.tsx`).sort())
  })

  it.each(Object.keys(PAGES))("%s has a title and one short sentence in English and Spanish", (kind) => {
    for (const catalog of [en, es]) {
      const title = String(lookup(catalog, `emptyStates.${kind}.title`) ?? "")
      const description = String(lookup(catalog, `emptyStates.${kind}.description`) ?? "")
      expect(words(title).length, `${kind} title`).toBeGreaterThan(0)
      expect(words(title).length, title).toBeLessThanOrEqual(6)
      expect(words(description).length, description).toBeGreaterThan(3)
      expect(words(description).length, description).toBeLessThanOrEqual(20)
      expect(description.match(/[.!?](\s|$)/g)?.length ?? 0, description).toBe(1)
    }
  })

  it("draws with the kit's theme tokens, never a fixed colour", () => {
    const literals = (existsSync(KINDS_DIR) ? readdirSync(KINDS_DIR) : []).flatMap((name) =>
      [...readFileSync(path.join(KINDS_DIR, name), "utf8").matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\(/g)].map((match) => `${name}: ${match[0]}`)
    )
    expect(literals).toEqual([])
  })
})

describe("EmptyState", () => {
  it.each(Object.keys(PAGES))("draws %s with its copy", async (kind) => {
    const { container } = await renderIn(<EmptyState kind={kind as keyof typeof EMPTY_STATES} />)

    expect(container.querySelector(`[data-empty-state="${kind}"] svg rect`)).toBeTruthy()
    expect(screen.getByRole("heading", { name: String(lookup(es, `emptyStates.${kind}.title`)) })).toBeTruthy()
  })
})

describe("NoRecords", () => {
  it("shows a kind's empty state and its action", async () => {
    await renderIn(<NoRecords kind="collections" action={{ to: "/collections/create", label: "Crear colección" }} />)

    expect(screen.getByRole("heading", { name: "Agrupá productos en colecciones" })).toBeTruthy()
    expect(screen.getByRole("link", { name: "Crear colección" }).getAttribute("href")).toBe("/collections/create")
    expect(screen.queryByText("No hay registros")).toBeNull()
  })

  it("keeps the plain block for sections that pass no kind", async () => {
    const { container } = await renderIn(<NoRecords message="Este grupo no tiene clientes." />)

    expect(screen.getByText("Este grupo no tiene clientes.")).toBeTruthy()
    expect(container.querySelector("[data-empty-state]")).toBeNull()
  })
})

describe("the list pages", () => {
  it.each(Object.entries(PAGES))("%s passes its kind", (kind, file) => {
    const source = readFileSync(path.join(SRC, file), "utf8")
    expect(source).toMatch(new RegExp(`kind(:|=)\\s*"${kind}"`))
  })
})

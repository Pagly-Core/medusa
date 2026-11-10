// @vitest-environment jsdom
// Pagly: a location's shipping reads as a short list, a card per method, each
// zone with its rates as rows (PAGLY-CORE-DIVERGENCE.md).
import { cleanup, render, screen, within } from "@testing-library/react"
import { TooltipProvider } from "@medusajs/ui"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { LocationGeneralSection } from "../location-general-section"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options && Object.keys(options).length ? `${key}:${JSON.stringify(options)}` : key,
  }),
}))

const { mutation } = vi.hoisted(() => ({ mutation: () => ({ mutateAsync: () => Promise.resolve(), isPending: false }) }))
vi.mock("../../../../../../hooks/api/fulfillment-sets", () => ({
  useDeleteFulfillmentServiceZone: mutation,
  useDeleteFulfillmentSet: mutation,
}))
vi.mock("../../../../../../hooks/api/shipping-options", () => ({
  useDeleteShippingOption: mutation,
}))
const STORE = {
  default_region_id: "reg_uy",
  supported_currencies: [
    { currency_code: "usd", is_default: false },
    { currency_code: "uyu", is_default: true },
  ],
}
const { storeState } = vi.hoisted(() => ({ storeState: { store: undefined as unknown } }))
vi.mock("../../../../../../hooks/api/store", () => ({
  useStore: () => storeState,
}))
vi.mock("../../../../../../hooks/api/stock-locations", () => ({
  useCreateStockLocationFulfillmentSet: mutation,
  useDeleteStockLocation: mutation,
}))

const inStore = [{ attribute: "enabled_in_store", value: "true", operator: "eq" }]
const returns = [...inStore, { attribute: "is_return", value: "true", operator: "eq" }]

const option = (id: string, name: string, extra: Record<string, unknown> = {}) => ({
  id,
  name,
  service_zone_id: "serzo_uy",
  provider_id: "manual_manual",
  price_type: "flat",
  rules: inStore,
  prices: [],
  shipping_profile: { name: "Default" },
  ...extra,
})

const LOCATION = {
  id: "sloc_1",
  name: "Nike Warehouse",
  address: { address_1: "Cerro Largo 1062", city: "Montevideo", country_code: "uy" },
  fulfillment_sets: [
    {
      id: "fuset_pickup",
      type: "pickup",
      name: "Pickup",
      service_zones: [
        {
          id: "serzo_pickup",
          name: "Local Pocitos",
          geo_zones: [{ type: "country", country_code: "uy" }],
          shipping_options: [option("so_local", "Local Pocitos", { prices: [{ amount: 0, currency_code: "uyu" }] })],
        },
      ],
    },
    {
      id: "fuset_ship",
      type: "shipping",
      name: "Shipping",
      service_zones: [
        {
          id: "serzo_uy",
          name: "Nike UY Zone",
          geo_zones: [{ type: "country", country_code: "uy" }],
          shipping_options: [
            option("so_std", "Standard", {
              prices: [
                { amount: 0, currency_code: "uyu", price_rules: [{ attribute: "item_total", value: 2000 }] },
                { amount: 290, currency_code: "uyu", price_rules: [] },
              ],
            }),
            option("so_ues", "UES · Envío a domicilio", { price_type: "calculated", provider_id: "ues_ues" }),
            option("so_ruled", "Express", {
              prices: [
                { amount: 0, currency_code: "uyu", price_rules: [{ attribute: "item_total", value: 2000 }] },
              ],
            }),
            option("so_region", "Región", {
              prices: [
                { amount: 290, currency_code: "uyu", price_rules: [] },
                { amount: 320, currency_code: "uyu", price_rules: [{ attribute: "region_id", operator: "eq", value: "reg_uy" }] },
              ],
            }),
            option("so_region_only", "Solo región", {
              prices: [
                { amount: 380, currency_code: "uyu", price_rules: [{ attribute: "region_id", operator: "eq", value: "reg_uy" }] },
              ],
            }),
            option("so_dollars", "Dólares", { prices: [{ amount: 10, currency_code: "usd", price_rules: [] }] }),
            option("so_off", "Apagada", {
              rules: [{ attribute: "enabled_in_store", value: "false", operator: "eq" }],
              prices: [{ amount: 50, currency_code: "uyu" }],
            }),
            option("so_two", "Courier", {
              prices: [
                { amount: 10, currency_code: "usd", price_rules: [] },
                { amount: 450, currency_code: "uyu", price_rules: [] },
              ],
            }),
            option("so_hidden", "Moto", { rules: [], prices: [{ amount: 12.5, currency_code: "uyu" }] }),
            option("so_back", "Devolución", { rules: returns, prices: [{ amount: 150, currency_code: "uyu" }] }),
          ],
        },
        {
          id: "serzo_este",
          name: "Este",
          geo_zones: [{ type: "province", country_code: "uy", province_code: "uy-ma" }],
          shipping_options: [],
        },
      ],
    },
  ],
} as never

const renderSection = (location = LOCATION) =>
  render(
    <TooltipProvider>
      <MemoryRouter>
        <LocationGeneralSection location={location} />
      </MemoryRouter>
    </TooltipProvider>
  )

beforeEach(() => {
  storeState.store = STORE
  ;(globalThis as Record<string, unknown>).__paglyProviderLooks = { ues_ues: { name: "UES", logo: null } }
})

afterEach(() => {
  cleanup()
  delete (globalThis as Record<string, unknown>).__paglyProviderLooks
})

const card = (heading: string) => screen.getByRole("heading", { name: heading }).closest("[data-fulfillment-set]") as HTMLElement

describe("a location's shipping", () => {
  it("shows shipping first, then pickup, each switched on", () => {
    renderSection()
    const headings = screen.getAllByRole("heading", { level: 2 }).map((one) => one.textContent)
    expect(headings).toEqual([
      "stockLocations.fulfillmentSets.shipping.header",
      "stockLocations.fulfillmentSets.pickup.header",
    ])
    for (const toggle of screen.getAllByRole("switch")) {
      expect(toggle.getAttribute("aria-checked")).toBe("true")
    }
  })

  it("reads each zone as its name and what it covers, without counts or icons", () => {
    renderSection()
    const shipping = card("stockLocations.fulfillmentSets.shipping.header")
    expect(within(shipping).getByText("Nike UY Zone")).toBeTruthy()
    expect(within(shipping).getByText("Uruguay")).toBeTruthy()
    expect(within(shipping).getByText("Este")).toBeTruthy()
    expect(within(shipping).getByText("Uruguay · Maldonado")).toBeTruthy()
    expect(shipping.textContent).not.toMatch(/fields\.count/)
  })

  it("lists each rate with its price: the base one, free, or the carrier's", () => {
    renderSection()
    const standard = screen.getByText("Standard").closest("[data-rate]") as HTMLElement
    expect(standard.textContent).toMatch(/290/)
    const local = screen.getByText("Local Pocitos", { selector: "[data-rate] *" }).closest("[data-rate]") as HTMLElement
    expect(local.textContent).toMatch(/stockLocations\.shippingOptions\.fields\.free/)
    const ues = screen.getByText("UES · Envío a domicilio").closest("[data-rate]") as HTMLElement
    expect(ues.textContent).toMatch(/stockLocations\.shippingOptions\.fields\.carrierRate:\{"name":"UES"\}/)
  })

  it("prices in whole pesos when there are no cents, and says when checkout doesn't show a rate", () => {
    renderSection()
    const standard = screen.getByText("Standard").closest("[data-rate]") as HTMLElement
    expect(standard.textContent).not.toMatch(/290[.,]00/)
    const moto = screen.getByText("Moto").closest("[data-rate]") as HTMLElement
    expect(moto.textContent).toMatch(/12[.,]50/)
    const off = screen.getByText("Apagada").closest("[data-rate]") as HTMLElement
    expect(off.textContent).toMatch(/stockLocations\.shippingOptions\.fields\.hiddenInStore/)
    expect(standard.textContent).not.toMatch(/hiddenInStore/)
  })

  it("says a rate is hidden only when a rule hides it, as checkout offers one with no rules", () => {
    renderSection()
    const moto = screen.getByText("Moto").closest("[data-rate]") as HTMLElement
    expect(moto.textContent).not.toMatch(/hiddenInStore/)
  })

  it("reads the store's region price, which checkout charges before the plain one", () => {
    renderSection()
    const region = screen.getByText("Región").closest("[data-rate]") as HTMLElement
    expect(region.textContent).toMatch(/320/)
    expect(region.textContent).not.toMatch(/290/)
    const regionOnly = screen.getByText("Solo región").closest("[data-rate]") as HTMLElement
    expect(regionOnly.textContent).toMatch(/380/)
  })

  it("names the currency of a rate priced only in another one", () => {
    renderSection()
    const dollars = screen.getByText("Dólares").closest("[data-rate]") as HTMLElement
    expect(dollars.textContent).toMatch(/USD/)
    expect(dollars.textContent).toMatch(/10/)
  })

  it("shows no price until the store's currency is known", () => {
    storeState.store = undefined
    renderSection()
    const courier = screen.getByText("Courier").closest("[data-rate]") as HTMLElement
    expect(courier.textContent).not.toMatch(/\d/)
  })

  it("shows a zone's whole coverage on hover when the line is cut short", () => {
    renderSection()
    const shipping = card("stockLocations.fulfillmentSets.shipping.header")
    expect(within(shipping).getByText("Uruguay · Maldonado").getAttribute("title")).toBe("Uruguay · Maldonado")
  })

  it("never reads a rule's price, like free over an amount, as the rate's own", () => {
    renderSection()
    const express = screen.getByText("Express").closest("[data-rate]") as HTMLElement
    expect(express.textContent).not.toMatch(/fields\.free/)
    expect(express.textContent).not.toMatch(/\d/)
  })

  it("prices a rate in the store's default currency when it has several", () => {
    renderSection()
    const courier = screen.getByText("Courier").closest("[data-rate]") as HTMLElement
    expect(courier.textContent).toMatch(/450/)
    expect(courier.textContent).not.toMatch(/10/)
  })

  it("shows no empty option sections, and returns only where a zone has some", () => {
    renderSection()
    expect(screen.queryByText("stockLocations.shippingOptions.create.shipping.label")).toBeNull()
    expect(screen.queryByText("stockLocations.shippingOptions.create.pickup.label")).toBeNull()
    expect(screen.getAllByText("stockLocations.shippingOptions.create.returns.label")).toHaveLength(1)
    expect(screen.getByText("Devolución").closest("[data-rate]")).toBeTruthy()
  })

  it("adds a rate under each zone and a zone under each card", () => {
    renderSection()
    const addRate = screen.getAllByRole("link", { name: /stockLocations\.shippingOptions\.create\.addRate/ })
    expect(addRate.map((link) => link.getAttribute("href"))).toEqual([
      "/settings/locations/sloc_1/fulfillment-set/fuset_ship/service-zone/serzo_uy/shipping-option/create",
      "/settings/locations/sloc_1/fulfillment-set/fuset_ship/service-zone/serzo_este/shipping-option/create",
      "/settings/locations/sloc_1/fulfillment-set/fuset_pickup/service-zone/serzo_pickup/shipping-option/create",
    ])
    const addZone = screen.getAllByRole("link", { name: /stockLocations\.serviceZones\.create\.action/ })
    expect(addZone.map((link) => link.getAttribute("href"))).toEqual([
      "/settings/locations/sloc_1/fulfillment-set/fuset_ship/service-zones/create",
      "/settings/locations/sloc_1/fulfillment-set/fuset_pickup/service-zones/create",
    ])
  })

  it("shows a method that is off as its header and switch alone", () => {
    renderSection({ ...(LOCATION as object), fulfillment_sets: [] } as never)
    for (const toggle of screen.getAllByRole("switch")) {
      expect(toggle.getAttribute("aria-checked")).toBe("false")
    }
    expect(screen.queryAllByRole("link", { name: /create/ })).toHaveLength(0)
  })
})

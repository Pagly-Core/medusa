import { describe, expect, it } from "vitest"

import { breadcrumbLabel } from "../breadcrumb-label"

const t = ((key: string, options?: { ns?: string }) => `${options?.ns ?? "translation"}:${key}`) as any

// Pagly-Core/pagly-app#354: a plugin's pages (Reseñas, Preventas, Ofertas…)
// define a sidebar label but no breadcrumb, so their breadcrumb was empty.
describe("a route's breadcrumb", () => {
  it("is its own breadcrumb when it has one", () => {
    expect(breadcrumbLabel({ breadcrumb: () => "Pedido #12", label: "orders.domain" } as any, {} as any, t)).toBe("Pedido #12")
  })

  it("falls back to its sidebar label, translated, when it has none", () => {
    expect(breadcrumbLabel({ label: "offers.domain", translationNs: "translation" } as any, {} as any, t)).toBe(
      "translation:offers.domain"
    )
  })

  it("is the label as written when it has no translation namespace", () => {
    expect(breadcrumbLabel({ label: "Reseñas" } as any, {} as any, t)).toBe("Reseñas")
  })

  it("is nothing for a route with neither", () => {
    expect(breadcrumbLabel(undefined, {} as any, t)).toBeUndefined()
    expect(breadcrumbLabel({} as any, {} as any, t)).toBeUndefined()
  })
})

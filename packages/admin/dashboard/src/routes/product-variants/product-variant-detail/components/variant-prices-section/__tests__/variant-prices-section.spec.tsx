// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key} ${JSON.stringify(options)}` : key,
  }),
}))

vi.mock("../../../../../../components/common/action-menu", () => ({ ActionMenu: () => null }))

vi.mock("../../../../../../hooks/api/regions", () => ({
  useRegions: () => ({ regions: [{ id: "reg_uy", name: "Uruguay", currency_code: "uyu" }] }),
}))

import { VariantPricesSection } from "../variant-prices-section"

afterEach(cleanup)

const variant = {
  id: "variant_1",
  product_id: "prod_1",
  prices: [
    { id: "price_base", currency_code: "uyu", amount: 500, rules: {} },
    { id: "price_uy", currency_code: "uyu", amount: 450, rules: { region_id: "reg_uy" } },
  ],
} as any

// Pagly-Core/pagly-app#260: the section dropped every price with rules, so a
// region's price never showed, and the count left it out.
describe("a variant's prices", () => {
  it("shows a region's price, named by its region, and counts it", () => {
    render(<VariantPricesSection variant={variant} />)

    expect(screen.getByText("Uruguay")).toBeTruthy()
    expect(screen.getByText(/products\.variant\.pricesPagination/).textContent).toContain('"total":2')
  })

  it("keeps the price for every region under its currency", () => {
    render(<VariantPricesSection variant={variant} />)

    expect(screen.getByText("UYU")).toBeTruthy()
  })
})

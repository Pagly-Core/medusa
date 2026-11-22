// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { makeProduct } from "../__fixtures__/product"
import { ProductDetail } from "../product-detail"

vi.hoisted(() => {
  const globals = globalThis as Record<string, unknown>
  globals.__BACKEND_URL__ = "http://localhost:9000"
  globals.__AUTH_TYPE__ = "session"
  globals.__JWT_TOKEN_STORAGE_KEY__ = ""
  globals.__STOREFRONT_URL__ = ""
  globals.__BASE__ = "/"
})

const { parts } = vi.hoisted(() => ({
  parts: { current: {} as Record<string, unknown[]> },
}))

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useLoaderData: () => undefined,
  useParams: () => ({ id: "prod_1" }),
  Outlet: () => <div data-testid="outlet" />,
}))

vi.mock("../../../../hooks/api/products", () => ({
  useProduct: () => ({
    product: makeProduct(),
    isLoading: false,
    isError: false,
  }),
}))

vi.mock("../use-product-page-facts", () => ({
  useProductPageFacts: () => ({
    variants: [],
    currency: "uyu",
    places: 1,
    sales: new Map(),
    cover: null,
    isPending: false,
  }),
}))

vi.mock("../../../../providers/extension-provider", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  useExtension: () => ({
    getWidgets: (zone: string) => parts.current[zone] ?? [],
    getDisplays: () => [],
    getMenu: () => [],
  }),
}))

vi.mock("../../../../components/layout-composer", () => ({
  LayoutComposer: () => <div data-testid="layout-composer" />,
  detailPageDefaultEntries: () => null,
}))

const { markerModule } = vi.hoisted(() => ({
  markerModule: (name: string, id: string) => async () => {
    const { createElement } = await import("react")
    return { [name]: () => createElement("div", { "data-testid": id }) }
  },
}))

vi.mock("../components/product-header", markerModule("ProductHeader", "header"))
vi.mock(
  "../components/product-blockers",
  markerModule("ProductBlockers", "blockers")
)
vi.mock(
  "../components/product-media-section",
  markerModule("ProductMediaSection", "photos")
)
vi.mock(
  "../components/product-variant-section",
  markerModule("ProductVariantSection", "variants")
)
vi.mock(
  "../components/product-description-section",
  markerModule("ProductDescriptionSection", "description")
)
vi.mock(
  "../components/product-where-section",
  markerModule("ProductWhereSection", "where")
)
vi.mock(
  "../components/product-organization-section",
  markerModule("ProductOrganizationSection", "organization")
)
vi.mock(
  "../components/product-shipping-section",
  markerModule("ProductShippingSection", "shipping")
)
vi.mock(
  "../components/product-selling-section",
  markerModule("ProductSellingSection", "selling")
)

afterEach(() => {
  cleanup()
  parts.current = {}
})

const ids = () => screen.getAllByTestId(/.+/).map((el) => el.dataset.testid)

describe("ProductDetail", () => {
  it("lays the product out as the approved design, with no drag-and-drop layout", () => {
    parts.current["product.details.main"] = [
      () => <div data-testid="more-data" />,
    ]
    parts.current["product.details.side"] = [
      () => <div data-testid="reviews" />,
    ]
    render(<ProductDetail />)

    expect(screen.queryByTestId("layout-composer")).toBeNull()
    expect(
      ids().filter((id) =>
        [
          "header",
          "blockers",
          "photos",
          "variants",
          "description",
          "more-data",
        ].includes(id!)
      )
    ).toEqual([
      "header",
      "blockers",
      "photos",
      "variants",
      "description",
      "more-data",
    ])
    expect(
      ids().filter((id) =>
        ["where", "organization", "shipping", "selling", "reviews"].includes(
          id!
        )
      )
    ).toEqual(["where", "organization", "shipping", "selling", "reviews"])
  })

  it("puts the side column after the main one, so a phone reads price and stock first", () => {
    render(<ProductDetail />)
    expect(ids().indexOf("description")).toBeLessThan(ids().indexOf("where"))
  })

  it("never renders the old zones at the page's ends", () => {
    parts.current["product.details.after"] = [
      () => <div data-testid="legacy" />,
    ]
    parts.current["product.details.side.after"] = [
      () => <div data-testid="legacy-side" />,
    ]
    render(<ProductDetail />)
    expect(screen.queryByTestId("legacy")).toBeNull()
    expect(screen.queryByTestId("legacy-side")).toBeNull()
  })

  it("keeps the outlet for the product's drawers", () => {
    render(<ProductDetail />)
    expect(screen.getByTestId("outlet")).toBeTruthy()
  })
})

// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

import { ProductVariantDetailBreadcrumb, seo } from "../breadcrumb"
import { VariantGeneralSection } from "../components/variant-general-section"
import { VARIANT_DETAIL_FIELDS } from "../constants"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock("../../../../hooks/api", () => ({
  useProductVariant: (
    _productId: string,
    _variantId: string,
    _query: unknown,
    options: { initialData: { variant: unknown } }
  ) => ({ variant: options.initialData.variant }),
}))

vi.mock("../../../../lib/storefront", () => ({
  useStorefrontHref: () => (path: string) => `http://localhost:8000${path}`,
}))

vi.mock("../../../../hooks/api/products", () => ({
  useDeleteVariant: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock("../../../../providers/feature-flag-provider", () => ({
  useFeatureFlag: () => false,
}))

afterEach(() => {
  cleanup()
})

const keychain = {
  id: "variant_keychain",
  product_id: "prod_keychain",
  title: "Default variant",
  sku: "LLAVERO",
  product: {
    id: "prod_keychain",
    title: "Llavero de cuero",
    handle: "llavero",
    status: "published",
  },
  options: [
    {
      id: "optval_default",
      value: "Default option value",
      option: { id: "opt_default", title: "Default option" },
    },
  ],
  prices: [],
} as any

const shirt = {
  id: "variant_shirt",
  product_id: "prod_shirt",
  title: "M / Negro",
  sku: "REMERA-M-NEGRO",
  product: {
    id: "prod_shirt",
    title: "Remera",
    handle: "remera",
    status: "published",
  },
  options: [
    { id: "optval_m", value: "M", option: { id: "opt_size", title: "Talle" } },
    {
      id: "optval_black",
      value: "Negro",
      option: { id: "opt_color", title: "Color" },
    },
  ],
  prices: [],
} as any

const renderSection = (variant: any) =>
  render(
    <MemoryRouter>
      <VariantGeneralSection variant={variant} />
    </MemoryRouter>
  )

const match = (variant: any) =>
  ({
    params: { id: variant.product_id, variant_id: variant.id },
    loaderData: { variant },
  } as any)

describe("VariantGeneralSection", () => {
  it("heads a product's one variant with the product's title", () => {
    renderSection(keychain)

    expect(screen.getByRole("heading").textContent).toBe("Llavero de cuero")
    expect(screen.queryByText(/Default variant/)).toBeNull()
  })

  it("leaves out the default option's row", () => {
    renderSection(keychain)

    expect(screen.queryByText(/Default option/)).toBeNull()
    expect(screen.getByText("LLAVERO")).toBeTruthy()
  })

  it("keeps a variant's own title and option rows", () => {
    renderSection(shirt)

    expect(screen.getByRole("heading").textContent).toBe("M / Negro")
    expect(screen.getByText("Talle")).toBeTruthy()
    expect(screen.getByText("M")).toBeTruthy()
    expect(screen.getByText("Color")).toBeTruthy()
    expect(screen.getByText("Negro")).toBeTruthy()
  })
})

describe("the variant page's breadcrumb and title", () => {
  it("asks for the product's title along with the variant", () => {
    expect(VARIANT_DETAIL_FIELDS.split(",")).toContain("+product.title")
  })

  it("names a product's one variant after the product", () => {
    render(<ProductVariantDetailBreadcrumb {...match(keychain)} />)

    expect(screen.getByText("Llavero de cuero")).toBeTruthy()
    expect(screen.queryByText(/Default variant/)).toBeNull()
    expect(seo(match(keychain)).title).toBe("Llavero de cuero")
  })

  it("keeps a variant's own title", () => {
    render(<ProductVariantDetailBreadcrumb {...match(shirt)} />)

    expect(screen.getByText("M / Negro")).toBeTruthy()
    expect(seo(match(shirt)).title).toBe("M / Negro")
  })
})

// @vitest-environment jsdom
import { TooltipProvider } from "@medusajs/ui"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

import { getLocaleAmount } from "../../../../lib/money-amount-helpers"
import {
  DEFAULT_OPTION,
  SIZE,
  makeFacts,
  makeProduct,
  makeVariant,
} from "../__fixtures__/product"
import { ProductVariantSection } from "../components/product-variant-section"

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>
  g.__BACKEND_URL__ = "http://localhost:9000"
  g.__AUTH_TYPE__ = "session"
  g.__JWT_TOKEN_STORAGE_KEY__ = ""
})

const { prompt, deleteVariant } = vi.hoisted(() => ({
  prompt: vi.fn(async (_: unknown) => true),
  deleteVariant: vi.fn(async (_: unknown) => ({})),
}))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key} ${JSON.stringify(values)}` : key,
    i18n: { language: "es" },
  }),
}))

vi.mock("@medusajs/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@medusajs/ui")>()),
  usePrompt: () => prompt,
}))

vi.mock("../../../../hooks/api/products", () => ({
  useDeleteVariantLazy: () => ({ mutateAsync: deleteVariant }),
}))

vi.mock("../../../../components/common/action-menu", () => ({
  ActionMenu: ({
    groups,
  }: {
    groups: { actions: { label: string; onClick?: () => void }[] }[]
  }) => (
    <span>
      {groups
        .flatMap((g) => g.actions)
        .map((a) => (
          <button key={a.label} onClick={a.onClick}>
            {a.label}
          </button>
        ))}
    </span>
  ),
}))

afterEach(() => {
  cleanup()
  prompt.mockClear()
  deleteVariant.mockClear()
})

// Testing Library reads the page's no-break spaces as spaces.
const money = (n: number) =>
  getLocaleAmount(n, "uyu", { wholeWithoutCents: true }).replace(/ /g, " ")

const renderIn = (node: React.ReactNode) =>
  render(
    <MemoryRouter>
      <TooltipProvider>{node}</TooltipProvider>
    </MemoryRouter>
  )

describe("Variantes y precios", () => {
  it("says the options above the rows, leaving out the default one", () => {
    renderIn(
      <ProductVariantSection
        product={makeProduct({ options: [DEFAULT_OPTION, SIZE] })}
        facts={makeFacts({
          variants: [makeVariant(null, "M"), makeVariant(null, "XL")],
        })}
      />
    )
    expect(screen.getByText("Talle:")).toBeTruthy()
    expect(screen.getByText("M, XL")).toBeTruthy()
    expect(screen.queryByText(/Default option/)).toBeNull()
  })

  it("shows each variant's price and stock, out of stock in words", () => {
    renderIn(
      <ProductVariantSection
        product={makeProduct({ options: [SIZE] })}
        facts={makeFacts({
          variants: [
            makeVariant(null, "M", { inventory_quantity: 6 }),
            makeVariant(null, "XL", { inventory_quantity: 0 }),
          ],
        })}
      />
    )
    expect(screen.getAllByText(money(1290))).toHaveLength(2)
    expect(
      screen.getByText('products.page.variants.inStock {"count":6}')
    ).toBeTruthy()
    expect(screen.getByText("products.page.variants.outOfStock")).toBeTruthy()
  })

  it("says a variant the store doesn't count, or that sells without units", () => {
    renderIn(
      <ProductVariantSection
        product={makeProduct({ options: [SIZE] })}
        facts={makeFacts({
          variants: [
            makeVariant(null, "M", { manage_inventory: false }),
            makeVariant(null, "XL", {
              inventory_quantity: 0,
              allow_backorder: true,
            }),
          ],
        })}
      />
    )
    expect(screen.getByText("products.page.variants.untracked")).toBeTruthy()
    expect(screen.getByText("products.page.variants.backorder")).toBeTruthy()
  })

  it("groups by the first option, open up to 8 variants, and folds on a click", () => {
    renderIn(
      <ProductVariantSection product={makeProduct()} facts={makeFacts()} />
    )

    const group = screen.getByRole("button", { name: /Negro/ })
    expect(group.getAttribute("aria-expanded")).toBe("true")
    expect(
      screen.getByText('products.page.variants.groupCount {"count":2}')
    ).toBeTruthy()
    expect(
      screen.getByText('products.page.variants.someOut {"count":1}')
    ).toBeTruthy()
    expect(screen.getByText("XL")).toBeTruthy()

    fireEvent.click(group)
    expect(group.getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryByText("XL")).toBeNull()
  })

  it("starts the groups folded above 8 variants", () => {
    const variants = ["S", "M", "L", "XL", "XXL"].flatMap((s) => [
      makeVariant("Negro", s),
      makeVariant("Crudo", s),
    ])
    renderIn(
      <ProductVariantSection
        product={makeProduct()}
        facts={makeFacts({ variants })}
      />
    )
    expect(
      screen
        .getByRole("button", { name: /Crudo/ })
        .getAttribute("aria-expanded")
    ).toBe("false")
  })

  it("says a part's words for a variant with no units while it sells without stock", () => {
    renderIn(
      <ProductVariantSection
        product={makeProduct({ options: [SIZE] })}
        facts={makeFacts({
          variants: [makeVariant(null, "M", { inventory_quantity: 0 })],
          cover: { row: "En preventa", summary: "x" },
        })}
      />
    )
    expect(screen.getByText("En preventa")).toBeTruthy()
    expect(screen.queryByText("products.page.variants.outOfStock")).toBeNull()
  })

  it("says the part's words only for the variants it covers", () => {
    renderIn(
      <ProductVariantSection
        product={makeProduct({ options: [SIZE] })}
        facts={makeFacts({
          variants: [
            makeVariant(null, "M", { inventory_quantity: 0 }),
            makeVariant(null, "XL", { inventory_quantity: 0 }),
          ],
          cover: {
            row: "En preventa",
            summary: "x",
            variant_ids: ["variant_x_M"],
          },
        })}
      />
    )
    expect(screen.getByText("En preventa")).toBeTruthy()
    expect(screen.getByText("products.page.variants.outOfStock")).toBeTruthy()
  })

  it("shows the offer price with the normal one struck through, and names the offer", () => {
    const sales = new Map([
      ["variant_x_M", { amount: 990, offer: "Black Week", ends_at: null, type: "sale" as const }],
    ])
    renderIn(
      <ProductVariantSection
        product={makeProduct({ options: [SIZE] })}
        facts={makeFacts({ variants: [makeVariant(null, "M")], sales })}
      />
    )
    expect(screen.getByText(money(990))).toBeTruthy()
    expect(screen.getByText(money(1290)).tagName).toBe("S")
    expect(
      screen.getByText('products.page.variants.sale {"name":"Black Week"}')
    ).toBeTruthy()
  })

  it("edits prices from a pencil, and keeps stock, add and options in the menu", () => {
    renderIn(
      <ProductVariantSection product={makeProduct()} facts={makeFacts()} />
    )
    expect(
      screen
        .getByRole("link", { name: "products.page.variants.editPrices" })
        .getAttribute("href")
    ).toBe("/prices")
    expect(screen.getByText("inventory.stock.action")).toBeTruthy()
    expect(screen.getByText("products.page.variants.addVariant")).toBeTruthy()
    expect(screen.getByText("products.page.variants.editOptions")).toBeTruthy()
  })
})

describe("review fixes", () => {
  it("names every running offer once", () => {
    const sales = new Map([
      ["variant_x_M", { amount: 990, offer: "Black Week", ends_at: null, type: "sale" as const }],
      ["variant_x_XL", { amount: 990, offer: "Socios", ends_at: null, type: "sale" as const }],
    ])
    renderIn(
      <ProductVariantSection product={makeProduct({ options: [SIZE] })} facts={makeFacts({ variants: [makeVariant(null, "M"), makeVariant(null, "XL")], sales })} />
    )
    const note = screen.getByText(/products\.page\.variants\.sale/).textContent
    expect(note).toContain("Black Week")
    expect(note).toContain("Socios")
  })

  it("shows an override's higher price as the price, with nothing struck", () => {
    const sales = new Map([["variant_x_M", { amount: 1500, offer: "Mayoristas", ends_at: null, type: "override" as const }]])
    const { container } = renderIn(
      <ProductVariantSection product={makeProduct({ options: [SIZE] })} facts={makeFacts({ variants: [makeVariant(null, "M")], sales })} />
    )
    expect(screen.getByText(money(1500))).toBeTruthy()
    expect(container.querySelector("s")).toBeNull()
  })

  it("finds a variant by name or SKU once there are more than 20", () => {
    const sizes = Array.from({ length: 21 }, (_, i) => `T${i}`)
    renderIn(
      <ProductVariantSection product={makeProduct({ options: [SIZE] })} facts={makeFacts({ variants: sizes.map((s) => makeVariant(null, s)) })} />
    )
    const search = screen.getByRole("searchbox", { name: "products.page.variants.search" })
    fireEvent.change(search, { target: { value: "T13" } })
    expect(screen.getByText("T13")).toBeTruthy()
    expect(screen.queryByText("T12")).toBeNull()
  })

  it("has no search with 20 variants or fewer", () => {
    renderIn(<ProductVariantSection product={makeProduct()} facts={makeFacts()} />)
    expect(screen.queryByRole("searchbox")).toBeNull()
  })
})

describe("Precio y stock, for a product in one version", () => {
  const one = () =>
    renderIn(
      <ProductVariantSection
        product={makeProduct({ title: "Taza", options: [DEFAULT_OPTION] })}
        facts={makeFacts({
          variants: [
            makeVariant(null, null, {
              title: "Default variant",
              sku: "TAZA-01",
              inventory_quantity: 14,
              options: [
                { option_id: "opt_default", value: "Default option value" },
              ],
            }),
          ],
        })}
      />
    )

  it("shows price, stock and SKU as rows, not a table", () => {
    one()
    expect(screen.getByText("products.page.variants.titleOne")).toBeTruthy()
    expect(screen.getByText(money(1290))).toBeTruthy()
    expect(
      screen.getByText('products.page.variants.inStock {"count":14}')
    ).toBeTruthy()
    expect(screen.getByText("TAZA-01")).toBeTruthy()
    expect(
      screen.queryByText("products.page.variants.columns.variant")
    ).toBeNull()
  })

  it("offers to add options", () => {
    one()
    expect(
      screen
        .getByRole("link", { name: "products.page.variants.addOptions" })
        .getAttribute("href")
    ).toBe("/options/manage")
  })
})

describe("a variant's menu", () => {
  it("names the product in the delete prompt of its one version", async () => {
    renderIn(
      <ProductVariantSection
        product={makeProduct({
          title: "Taza",
          options: [DEFAULT_OPTION, SIZE],
        })}
        facts={makeFacts({
          variants: [
            makeVariant(null, "M", { title: "Default variant" }),
            makeVariant(null, "XL"),
          ],
        })}
      />
    )
    fireEvent.click(screen.getAllByText("actions.delete")[0])
    await vi.waitFor(() => expect(prompt).toHaveBeenCalled())
    expect(JSON.stringify(prompt.mock.calls[0][0])).toContain("Taza")
  })
})

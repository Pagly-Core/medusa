// @vitest-environment jsdom
import { TooltipProvider } from "@medusajs/ui"
import { cleanup, render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

import { getLocaleAmount } from "../../../../lib/money-amount-helpers"
import { makeFacts, makeProduct, makeVariant } from "../__fixtures__/product"
import { ProductBlockers } from "../components/product-blockers"
import { ProductHeader } from "../components/product-header"

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>
  g.__BACKEND_URL__ = "http://localhost:9000"
  g.__AUTH_TYPE__ = "session"
  g.__JWT_TOKEN_STORAGE_KEY__ = ""
  g.__STOREFRONT_URL__ = "https://tienda.test"
})

const { mutateAsync, parts } = vi.hoisted(() => ({
  mutateAsync: vi.fn(async () => ({})),
  parts: { current: {} as Record<string, unknown[]> },
}))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key} ${JSON.stringify(values)}` : key,
    i18n: { language: "es" },
  }),
}))

vi.mock("../../../../hooks/api/products", () => ({
  useUpdateProduct: () => ({ mutateAsync, isPending: false }),
  useDeleteProduct: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock("../../../../providers/extension-provider", () => ({
  useExtension: () => ({ getWidgets: (zone: string) => parts.current[zone] ?? [] }),
}))

vi.mock("../../../../components/common/action-menu", () => ({
  ActionMenu: ({ groups }: { groups: { actions: { label: string }[] }[] }) => (
    <ul data-testid="menu">
      {groups.flatMap((g) => g.actions).map((a) => (
        <li key={a.label}>{a.label}</li>
      ))}
    </ul>
  ),
}))

afterEach(() => {
  cleanup()
  parts.current = {}
  mutateAsync.mockClear()
})

const money = (n: number) => getLocaleAmount(n, "uyu", { wholeWithoutCents: true })

const renderIn = (node: React.ReactNode) =>
  render(
    <MemoryRouter>
      <TooltipProvider>{node}</TooltipProvider>
    </MemoryRouter>
  )

describe("ProductHeader", () => {
  it("says the price range, the variants and the stock in one line", () => {
    const facts = makeFacts({
      variants: [
        makeVariant("Negro", "M", { inventory_quantity: 6 }),
        makeVariant("Negro", "XL", { prices: [{ amount: 1390, currency_code: "uyu", rules: {} }], inventory_quantity: 3 }),
      ],
      places: 2,
    })
    renderIn(<ProductHeader product={makeProduct()} facts={facts} />)

    expect(screen.getByRole("heading", { name: "Remera lino" })).toBeTruthy()
    expect(screen.getByText(`products.page.summary.range ${JSON.stringify({ min: money(1290), max: money(1390) })}`)).toBeTruthy()
    expect(screen.getByText('products.page.summary.variants {"count":2}')).toBeTruthy()
    expect(screen.getByText('products.page.summary.stockPlaces {"count":9,"places":2}')).toBeTruthy()
  })

  it("says one price, and the stock without places when the store has one", () => {
    const facts = makeFacts({ variants: [makeVariant(null, null, { inventory_quantity: 14, options: [] })] })
    renderIn(<ProductHeader product={makeProduct({ options: [] })} facts={facts} />)

    expect(screen.getByText(money(1290))).toBeTruthy()
    expect(screen.getByText('products.page.summary.stock {"count":14}')).toBeTruthy()
    expect(screen.queryByText(/products\.page\.summary\.variants/)).toBeNull()
  })

  it("says what a part selling without stock says", () => {
    const facts = makeFacts({
      variants: [makeVariant(null, "M", { inventory_quantity: 0 })],
      cover: { row: "En preventa", summary: "En preventa, llega 15 dic" },
    })
    renderIn(<ProductHeader product={makeProduct({ options: [] })} facts={facts} />)
    expect(screen.getByText("En preventa, llega 15 dic")).toBeTruthy()
  })

  it("opens the product in the store, and can't while it's a draft", () => {
    const { unmount } = renderIn(<ProductHeader product={makeProduct()} facts={makeFacts()} />)
    expect(screen.getByRole("link", { name: "onlineStore.view" }).getAttribute("href")).toContain("/products/remera-lino")
    unmount()

    renderIn(<ProductHeader product={makeProduct({ status: "draft" })} facts={makeFacts()} />)
    expect(screen.queryByRole("link", { name: "onlineStore.view" })).toBeNull()
    const disabled = screen.getByRole("button", { name: "onlineStore.view" }) as HTMLButtonElement
    expect(disabled.disabled).toBe(true)
  })

  it("renders the header parts with the product", () => {
    parts.current["product.details.header"] = [({ data }: { data: { title: string } }) => <span>ask about {data.title}</span>]
    renderIn(<ProductHeader product={makeProduct()} facts={makeFacts()} />)
    expect(screen.getByText("ask about Remera lino")).toBeTruthy()
  })

  it("keeps un-publish, translations and delete in the menu", () => {
    renderIn(<ProductHeader product={makeProduct()} facts={makeFacts()} />)
    const menu = within(screen.getByTestId("menu"))
    expect(menu.getByText("products.page.header.unpublish")).toBeTruthy()
    expect(menu.getByText("actions.delete")).toBeTruthy()
  })
})

describe("ProductBlockers", () => {
  it("is not there while nothing stops the product from selling", () => {
    const { container } = renderIn(
      <ProductBlockers product={makeProduct()} facts={makeFacts({ variants: [makeVariant("Negro", "M")] })} />
    )
    expect(container.textContent).toBe("")
  })

  it("names the variants out of stock, with the fix, and no heading for one", () => {
    renderIn(<ProductBlockers product={makeProduct()} facts={makeFacts()} />)

    expect(screen.getByText('products.page.blockers.someOut.title {"count":1,"names":"Negro · XL"}')).toBeTruthy()
    expect(screen.queryByText("products.page.blockers.title")).toBeNull()
    expect(screen.getByRole("link", { name: "products.page.blockers.someOut.action" }).getAttribute("href")).toBe("/stock")
  })

  it("lists a new product's blockers under a heading, and publishes from there", async () => {
    const draft = makeProduct({ status: "draft", images: [], thumbnail: null })
    const facts = makeFacts({ variants: [makeVariant(null, "S", { prices: [], inventory_quantity: 0 })] })
    renderIn(<ProductBlockers product={draft} facts={facts} />)

    expect(screen.getByText("products.page.blockers.title")).toBeTruthy()
    for (const id of ["noPrice", "noPhotos", "noStock", "draft"]) {
      expect(screen.getByText(new RegExp(`products\\.page\\.blockers\\.${id}\\.title`))).toBeTruthy()
    }
    expect(screen.getByRole("link", { name: "products.page.blockers.noPrice.action" }).getAttribute("href")).toBe("/prices")

    screen.getByRole("button", { name: "products.page.blockers.draft.action" }).click()
    await vi.waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ status: "published" }, expect.anything()))
  })
})

// @vitest-environment jsdom
import { FetchError } from "@medusajs/js-sdk"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react"
import { PropsWithChildren, ReactNode } from "react"
import { TooltipProvider } from "@medusajs/ui"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  MEDUSA_STOREFRONT_URL,
  storefrontHref,
  storefrontLinkBase,
  useStorefrontHref,
} from "../storefront"

/**
 * Pagly: "Ver en tienda online" (products, variants, categories,
 * collections) and the order's payment link open the store's own public
 * address. On a host serving many stores that address is per store, so the
 * admin asks @pagly/storefront's GET /admin/storefront for it at runtime:
 * its `live_url` (the address visitors reach), else its `url` (the preview
 * only the merchant opens, while the store has no public address yet). The
 * build-time storefront URL is only for a backend without that route.
 */

const fetchMock = vi.hoisted(() => vi.fn())
const copyMock = vi.hoisted(() => vi.fn())

vi.mock("copy-to-clipboard", () => ({ default: copyMock }))

vi.mock("../client", () => ({ sdk: { client: { fetch: fetchMock } } }))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock("@medusajs/ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@medusajs/ui")>()),
  usePrompt: () => vi.fn(),
}))

// The menu's items, flat, so the tests read each link's address.
vi.mock("../../components/common/action-menu", () => ({
  ActionMenu: ({
    groups,
  }: {
    groups: {
      actions: {
        label: string
        href?: string
        onClick?: () => void
        to?: string
      }[]
    }[]
  }) => (
    <ul>
      {groups.flatMap((group) =>
        group.actions.map((action) => (
          <li key={action.label}>
            {action.href ? (
              <a href={action.href}>{action.label}</a>
            ) : (
              <span>{action.label}</span>
            )}
          </li>
        ))
      )}
    </ul>
  ),
}))

vi.mock("../../hooks/api/products", () => ({
  useDeleteProduct: () => ({ mutateAsync: vi.fn() }),
  useDeleteVariant: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock("../../hooks/api/collections", () => ({
  useDeleteCollection: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock(
  "../../routes/categories/common/hooks/use-delete-product-category-action",
  () => ({ useDeleteProductCategoryAction: () => vi.fn() })
)

vi.mock("../../providers/extension-provider", () => ({
  useExtension: () => ({ getDisplays: () => [] }),
}))

vi.mock("../../providers/feature-flag-provider", () => ({
  useFeatureFlag: () => false,
}))

const LIVE = "https://oxo-2026.pagly.app"
const PREVIEW =
  "https://tplpreview-b2c-1.pagly.app/?tenant=oxo-2026&draft=tok_123"

const answer = (storefront: {
  url: string | null
  live_url?: string | null
  status?: "ready" | "pending"
}) => ({ storefront: { status: "ready" as const, ...storefront } })

const notFound = () => new FetchError("Not Found", "Not Found", 404)

let client: QueryClient

const Providers = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={client}>
    <MemoryRouter>{children}</MemoryRouter>
  </QueryClientProvider>
)

const renderWithProviders = (ui: ReactNode) =>
  render(ui, { wrapper: Providers })

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  fetchMock.mockReset()
  copyMock.mockReset()
})

afterEach(() => {
  cleanup()
  client.clear()
})

describe("storefrontHref", () => {
  it("puts the path on the store's address", () => {
    expect(storefrontHref(LIVE, "/products/batidor")).toBe(
      `${LIVE}/products/batidor`
    )
  })

  it("ignores a trailing slash on the address", () => {
    expect(storefrontHref(`${LIVE}/`, "/products/batidor")).toBe(
      `${LIVE}/products/batidor`
    )
  })

  it("keeps the address's query, which a preview needs on every request", () => {
    const href = new URL(storefrontHref(PREVIEW, "/products/batidor"))

    expect(href.origin).toBe("https://tplpreview-b2c-1.pagly.app")
    expect(href.pathname).toBe("/products/batidor")
    expect(href.searchParams.get("tenant")).toBe("oxo-2026")
    expect(href.searchParams.get("draft")).toBe("tok_123")
  })

  it("adds the path's own query to the address's", () => {
    const href = new URL(
      storefrontHref(PREVIEW, "/products/batidor?v_id=variant_1")
    )

    expect(href.pathname).toBe("/products/batidor")
    expect(href.searchParams.get("v_id")).toBe("variant_1")
    expect(href.searchParams.get("tenant")).toBe("oxo-2026")
  })

  it("keeps an encoded handle as it is", () => {
    expect(storefrontHref(LIVE, "/products/sart%C3%A9n")).toBe(
      `${LIVE}/products/sart%C3%A9n`
    )
  })
})

describe("storefrontLinkBase", () => {
  it("opens the store's public address over the editor's preview", () => {
    expect(storefrontLinkBase(answer({ url: PREVIEW, live_url: LIVE }))).toBe(
      LIVE
    )
  })

  it("opens the preview while the store has no public address yet", () => {
    expect(storefrontLinkBase(answer({ url: PREVIEW, live_url: null }))).toBe(
      PREVIEW
    )
  })

  it("opens the url when the backend names no live one", () => {
    expect(storefrontLinkBase(answer({ url: LIVE }))).toBe(LIVE)
  })

  it("has nothing to open while the storefront is being prepared", () => {
    expect(
      storefrontLinkBase(answer({ url: null, live_url: null, status: "pending" }))
    ).toBeUndefined()
  })
})

describe("useStorefrontHref", () => {
  const hrefFor = async (path: string) => {
    const { result } = renderHook(() => useStorefrontHref(), {
      wrapper: Providers,
    })

    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    await waitFor(() => expect(client.isFetching()).toBe(0))

    return result.current(path)
  }

  it("asks the backend for the store's storefront", async () => {
    fetchMock.mockResolvedValue(answer({ url: PREVIEW, live_url: LIVE }))

    await hrefFor("/products/batidor")

    expect(fetchMock).toHaveBeenCalledWith("/admin/storefront")
  })

  it("links to the store's public address", async () => {
    fetchMock.mockResolvedValue(answer({ url: PREVIEW, live_url: LIVE }))

    expect(await hrefFor("/products/batidor")).toBe(`${LIVE}/products/batidor`)
  })

  it("links to the preview while the store has no public address", async () => {
    fetchMock.mockResolvedValue(answer({ url: PREVIEW, live_url: null }))

    const href = new URL((await hrefFor("/products/batidor"))!)

    expect(href.origin).toBe("https://tplpreview-b2c-1.pagly.app")
    expect(href.searchParams.get("tenant")).toBe("oxo-2026")
  })

  it("has no link while the storefront is being prepared", async () => {
    fetchMock.mockResolvedValue(
      answer({ url: null, live_url: null, status: "pending" })
    )

    expect(await hrefFor("/products/batidor")).toBeUndefined()
  })

  it("has no link before the answer comes", () => {
    fetchMock.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useStorefrontHref(), {
      wrapper: Providers,
    })

    expect(result.current("/products/batidor")).toBeUndefined()
  })

  it("uses the build's storefront on a backend without the route", async () => {
    fetchMock.mockRejectedValue(notFound())

    expect(await hrefFor("/products/batidor")).toBe(
      storefrontHref(MEDUSA_STOREFRONT_URL, "/products/batidor")
    )
  })

  it("never stands the build's storefront in for a failed answer", async () => {
    fetchMock.mockRejectedValue(
      new FetchError("Internal Server Error", "Internal Server Error", 500)
    )

    expect(await hrefFor("/products/batidor")).toBeUndefined()
  })

  it("shares the answer the online store screens already have", async () => {
    client.setQueryData(["pagly-storefront"], answer({ url: PREVIEW, live_url: LIVE }))
    fetchMock.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useStorefrontHref(), {
      wrapper: Providers,
    })

    expect(result.current("/products/batidor")).toBe(
      `${LIVE}/products/batidor`
    )
  })
})

// The sections load the whole dashboard's modules on first import.
describe("Ver en tienda online", { timeout: 60_000 }, () => {
  beforeEach(() => {
    fetchMock.mockResolvedValue(answer({ url: PREVIEW, live_url: LIVE }))
  })

  const viewLink = async () =>
    (await screen.findByRole("link", { name: "onlineStore.view" })).getAttribute(
      "href"
    )

  it("opens the product on the store's public address", async () => {
    const { ProductGeneralSection } = await import(
      "../../routes/products/product-detail/components/product-general-section"
    )

    renderWithProviders(
      <ProductGeneralSection
        product={
          {
            id: "prod_1",
            title: "Set de gadgets de cocina 4 en 1",
            handle: "set-de-gadgets-de-cocina-4-en-1",
            status: "published",
            sales_channels: [{ id: "sc_1" }],
          } as any
        }
      />
    )

    expect(await viewLink()).toBe(`${LIVE}/products/set-de-gadgets-de-cocina-4-en-1`)
  })

  it("opens the variant on the store's public address", async () => {
    const { VariantGeneralSection } = await import(
      "../../routes/product-variants/product-variant-detail/components/variant-general-section"
    )

    renderWithProviders(
      <VariantGeneralSection
        variant={
          {
            id: "variant_1",
            title: "Rojo",
            product_id: "prod_1",
            options: [],
            product: { handle: "batidor", status: "published" },
          } as any
        }
      />
    )

    expect(await viewLink()).toBe(`${LIVE}/products/batidor?v_id=variant_1`)
  })

  it("opens the category on the store's public address", async () => {
    const { CategoryGeneralSection } = await import(
      "../../routes/categories/category-detail/components/category-general-section"
    )

    renderWithProviders(
      <CategoryGeneralSection
        category={
          {
            id: "pcat_1",
            name: "Cocina",
            handle: "cocina",
            is_active: true,
            is_internal: false,
          } as any
        }
      />
    )

    expect(await viewLink()).toBe(`${LIVE}/categories/cocina`)
  })

  it("opens the collection on the store's public address", async () => {
    const { CollectionGeneralSection } = await import(
      "../../routes/collections/collection-detail/components/collection-general-section"
    )

    renderWithProviders(
      <CollectionGeneralSection
        collection={{ id: "pcol_1", title: "Verano", handle: "verano" } as any}
      />
    )

    expect(await viewLink()).toBe(`${LIVE}/collections/verano`)
  })
})

describe("the order's payment link", { timeout: 60_000 }, () => {
  it("is on the store's public address", async () => {
    fetchMock.mockResolvedValue(answer({ url: PREVIEW, live_url: LIVE }))

    const { CopyPaymentLink } = await import(
      "../../routes/orders/order-detail/components/copy-payment-link"
    )

    renderWithProviders(
      <TooltipProvider>
        <CopyPaymentLink
          paymentCollection={
            { id: "paycol_1", amount: 100, currency_code: "uyu" } as any
          }
          order={{ id: "order_1", currency_code: "uyu" } as any}
        />
      </TooltipProvider>
    )

    await waitFor(() => expect(client.isFetching()).toBe(0))
    fireEvent.click(screen.getByRole("button"))

    expect(copyMock).toHaveBeenCalledWith(
      `${LIVE}/payment-collection/paycol_1?order_id=order_1`
    )
  })
})

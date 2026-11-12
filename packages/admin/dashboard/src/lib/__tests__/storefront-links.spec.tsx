// @vitest-environment jsdom
import { TooltipProvider } from "@medusajs/ui"
import {
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from "@testing-library/react"
import { PropsWithChildren, ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  MEDUSA_STOREFRONT_URL,
  STOREFRONT_HREF_HOOK_KEY,
  storefrontHref,
  useStorefrontHref,
} from "../storefront"

/**
 * Pagly: "Ver en tienda online" (products, variants, categories,
 * collections) and the order's payment link open the store's own public
 * address. One admin build serves every store on a multi-store host, so the
 * address can't come from the build: @pagly/storefront registers a hook on
 * globalThis (STOREFRONT_HREF_HOOK_KEY) that answers each store's links,
 * and the dashboard only falls back to the build's storefront without it.
 */

const copyMock = vi.hoisted(() => vi.fn())

vi.mock("copy-to-clipboard", () => ({ default: copyMock }))

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

const hooks = globalThis as Record<string, unknown>

/** What the plugin registers: links on `base`, or none while there is none. */
const register = (base: string | undefined) => {
  hooks[STOREFRONT_HREF_HOOK_KEY] = () => (path: string) =>
    base ? storefrontHref(base, path) : undefined
}

const Providers = ({ children }: PropsWithChildren) => (
  <MemoryRouter>
    <TooltipProvider>{children}</TooltipProvider>
  </MemoryRouter>
)

const renderWithProviders = (ui: ReactNode) =>
  render(ui, { wrapper: Providers })

beforeEach(() => {
  copyMock.mockReset()
  register(LIVE)
})

afterEach(() => {
  cleanup()
  delete hooks[STOREFRONT_HREF_HOOK_KEY]
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

  it("keeps the path's anchor", () => {
    expect(storefrontHref(LIVE, "/pages/preguntas#envios")).toBe(
      `${LIVE}/pages/preguntas#envios`
    )
  })

  it("keeps an encoded handle as it is", () => {
    expect(storefrontHref(LIVE, "/products/sart%C3%A9n")).toBe(
      `${LIVE}/products/sart%C3%A9n`
    )
  })
})

describe("useStorefrontHref", () => {
  it("links where the plugin says the store is", () => {
    const { result } = renderHook(() => useStorefrontHref())

    expect(result.current("/products/batidor")).toBe(
      `${LIVE}/products/batidor`
    )
  })

  it("has no link while the plugin has no address for the store", () => {
    register(undefined)

    const { result } = renderHook(() => useStorefrontHref())

    expect(result.current("/products/batidor")).toBeUndefined()
  })

  it("uses the build's storefront without the plugin", () => {
    delete hooks[STOREFRONT_HREF_HOOK_KEY]

    const { result } = renderHook(() => useStorefrontHref())

    expect(result.current("/products/batidor")).toBe(
      storefrontHref(MEDUSA_STOREFRONT_URL, "/products/batidor")
    )
  })
})

// The sections load the whole dashboard's modules on first import.
describe("Ver en tienda online", { timeout: 60_000 }, () => {
  const viewLink = async () =>
    (await screen.findByRole("link", { name: "onlineStore.view" })).getAttribute(
      "href"
    )

  const renderProduct = async () => {
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
  }

  it("opens the product on the store's public address", async () => {
    await renderProduct()

    expect(await viewLink()).toBe(
      `${LIVE}/products/set-de-gadgets-de-cocina-4-en-1`
    )
  })

  it("offers no link while the store has no address", async () => {
    register(undefined)
    await renderProduct()

    await screen.findByText("actions.edit")
    expect(screen.queryByText("onlineStore.view")).toBeNull()
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
  const renderLink = async () => {
    const { CopyPaymentLink } = await import(
      "../../routes/orders/order-detail/components/copy-payment-link"
    )

    renderWithProviders(
      <CopyPaymentLink
        paymentCollection={
          { id: "paycol_1", amount: 100, currency_code: "uyu" } as any
        }
        order={{ id: "order_1", currency_code: "uyu" } as any}
      />
    )

    return screen.getByRole("button")
  }

  it("is on the store's public address", async () => {
    fireEvent.click(await renderLink())

    expect(copyMock).toHaveBeenCalledWith(
      `${LIVE}/payment-collection/paycol_1?order_id=order_1`
    )
  })

  // Copying nothing without a word would leave the merchant pasting
  // whatever was on their clipboard.
  it("can't be copied while the store has no address", async () => {
    register(undefined)

    const button = await renderLink()

    expect(button.hasAttribute("disabled")).toBe(true)
    fireEvent.click(button)
    expect(copyMock).not.toHaveBeenCalled()
  })
})

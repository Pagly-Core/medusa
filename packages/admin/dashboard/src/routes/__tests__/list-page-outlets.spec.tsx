// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { TooltipProvider } from "@medusajs/ui"
import { cleanup, render, screen } from "@testing-library/react"
import { ComponentType, ReactNode } from "react"
import { createMemoryRouter, Outlet, RouterProvider } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

let viewConfigurations = false

vi.hoisted(() => {
  Object.assign(globalThis, {
    __BASE__: "/",
    __BACKEND_URL__: "/",
    __STOREFRONT_URL__: "/",
    __AUTH_TYPE__: "session",
    __JWT_TOKEN_STORAGE_KEY__: undefined,
  })
})

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}))

vi.mock("../../providers/permissions-provider/use-permissions", () => ({
  usePermissions: () => new Proxy({}, { get: () => () => true }),
}))

vi.mock("../../components/utilities/i18n", () => ({
  i18n: { t: (key: string) => key },
}))

vi.mock("../../providers/feature-flag-provider", () => ({
  useFeatureFlag: () => viewConfigurations,
}))

// The composer renders its sections and, unless a page passes
// hasOutlet={false}, an Outlet of its own (layout-composer.tsx).
vi.mock("../../components/layout-composer", () => {
  const Entry = ({ children }: { children: ReactNode }) => <>{children}</>
  const LayoutComposer = ({
    sections,
    hasOutlet = true,
  }: {
    sections: Record<string, ReactNode>
    hasOutlet?: boolean
  }) => (
    <>
      {sections.main}
      {hasOutlet && <Outlet />}
    </>
  )
  return { LayoutComposer: Object.assign(LayoutComposer, { Entry }) }
})

// The tables' bodies are not under test, only where the page mounts its Outlets.
vi.mock("../../components/table/data-table", () => ({ _DataTable: () => null }))
vi.mock("../../components/data-table", () => ({ DataTable: () => null }))
vi.mock("../../components/table/configurable-data-table", () => ({
  ConfigurableDataTable: () => null,
}))

import { ApiKeyManagementList } from "../api-key-management/api-key-management-list/api-key-management-list"
import { CollectionList } from "../collections/collection-list/collection-list"
import { CustomerGroupsList } from "../customer-groups/customer-group-list/customer-group-list"
import { CustomersList } from "../customers/customer-list/customer-list"
import { OrderList } from "../orders/order-list/order-list"
import { PriceListList } from "../price-lists/price-list-list/price-list-list"
import { ProductOptionList } from "../product-options/product-option-list/product-option-list"
import { ProductList } from "../products/product-list/product-list"
import { PromotionsList } from "../promotions/promotion-list/promotions-list"
import { RegionList } from "../regions/region-list/region-list"
import { UserList } from "../users/user-list/user-list"

const PAGES: [string, ComponentType, string][] = [
  ["products", ProductList, "/products"],
  ["promotions", PromotionsList, "/promotions"],
  ["orders", OrderList, "/orders"],
  ["api keys", ApiKeyManagementList, "/settings/publishable-api-keys"],
  ["collections", CollectionList, "/collections"],
  ["customer groups", CustomerGroupsList, "/customer-groups"],
  ["customers", CustomersList, "/customers"],
  ["price lists", PriceListList, "/price-lists"],
  ["product options", ProductOptionList, "/product-options"],
  ["regions", RegionList, "/settings/regions"],
  ["users", UserList, "/settings/users"],
]

const mountChildRoute = (Page: ComponentType, path: string) => {
  const router = createMemoryRouter(
    [
      {
        path,
        element: <Page />,
        children: [{ path: "create", element: <div role="dialog" /> }],
      },
    ],
    { initialEntries: [`${path}/create`] }
  )
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, enabled: false } },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

afterEach(() => {
  cleanup()
})

describe.each([false, true])(
  "list pages with view_configurations %s",
  (enabled) => {
    it.each(PAGES)(
      "%s mounts a child route's modal once",
      (_, Page, path) => {
        viewConfigurations = enabled
        mountChildRoute(Page, path)

        expect(screen.getAllByRole("dialog")).toHaveLength(1)
      }
    )
  }
)

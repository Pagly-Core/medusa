// @vitest-environment jsdom
import { TooltipProvider } from "@medusajs/ui"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock("../../../../providers/keybind-provider/hooks", () => ({
  useGlobalShortcuts: () => [],
}))
vi.mock("../../../../hooks/api/search-indexes", () => ({
  useSearchIndexes: () => ({ enabled: true }),
}))
vi.mock("../../../../providers/feature-flag-provider", () => ({
  useFeatureFlag: () => false,
}))
vi.mock("../../../../providers/permissions-provider", () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}))

const pluginPages = [
  { label: "Pagos", to: "/settings/pagos" },
  { label: "Checkout", to: "/settings/checkout" },
  { label: "Cuentas de clientes", to: "/settings/customer-accounts" },
  { label: "Notificaciones", to: "/settings/notifications" },
  { label: "Dominios", to: "/settings/domains" },
  { label: "Asistente IA", to: "/settings/asistente" },
]
vi.mock("../../../../providers/extension-provider", () => ({
  useExtension: () => ({ getMenu: () => pluginPages }),
}))

// The composer is not under test: it hands the sections to the sidebar's own
// layout component, as the real one does when nothing is customized.
vi.mock("../../../layout-composer", async () => {
  const { SettingsSidebarLayoutComponent } = await import(
    "../settings-sidebar-layout-component"
  )
  const Entry = ({ children }: { id: string; children: ReactNode }) => (
    <>{children}</>
  )
  const LayoutComposer = ({
    sections,
  }: {
    sections: Record<string, ReactNode>
  }) => <SettingsSidebarLayoutComponent sections={sections} />
  return { LayoutComposer: Object.assign(LayoutComposer, { Entry }) }
})
vi.mock("../../user-menu", () => ({ UserMenu: () => null }))
vi.mock("../../shell", () => ({ Shell: () => null }))

import { LayoutEditContext } from "../../../../providers/layout-edit-provider/layout-edit-context"
import { SettingsSidebar } from "../settings-layout"

const renderSidebar = (pathname = "/settings/store") =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <TooltipProvider>
        <LayoutEditContext.Provider
          value={{
            editMode: false,
            orderChildren: (children) => children,
            setChildrenOrder: () => {},
            isHidden: () => false,
            toggleHidden: () => {},
          }}
        >
          <SettingsSidebar />
        </LayoutEditContext.Provider>
      </TooltipProvider>
    </MemoryRouter>
  )

const links = () =>
  screen.getAllByRole("link").map((link) => link.textContent?.trim())

afterEach(cleanup)

describe("the settings sidebar", () => {
  // Pagly: the search's sticky header stacks inside the sidebar only, so a
  // full-screen form (FocusModal, z-index auto) draws over it.
  it("keeps its sticky search header inside its own stacking context", () => {
    renderSidebar()
    const search = screen.getByRole("searchbox")
    expect(search.closest("aside")?.className).toMatch(/isolate/)
  })

  it("shows Store, Selling, Customers and Advanced, in that order", () => {
    renderSidebar()
    const headings = [
      "app.nav.settings.store",
      "app.nav.settings.sell",
      "app.nav.settings.customers",
      "app.nav.settings.advanced",
    ].map((key) => screen.getByText(key))
    for (let i = 1; i < headings.length; i++) {
      expect(
        headings[i - 1].compareDocumentPosition(headings[i]) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy()
    }
  })

  it("lists the open groups' pages in order and folds Advanced", () => {
    renderSidebar()
    expect(links()).toEqual([
      "app.nav.settings.header",
      "app.nav.settings.storeGeneral",
      "users.domain",
      "Dominios",
      "Asistente IA",
      "Pagos",
      "Checkout",
      "app.nav.settings.shipping",
      "regions.domain",
      "taxRegions.domain",
      "salesChannels.domain",
      "Cuentas de clientes",
      "Notificaciones",
      "app.nav.tabs.returns",
    ])
  })

  it("opens Advanced on request", () => {
    renderSidebar()
    const heading = screen.getByText("app.nav.settings.advanced")
    fireEvent.click(
      within(heading.parentElement as HTMLElement).getByRole("button")
    )
    expect(
      screen.getByRole("link", { name: "workflowExecutions.domain" })
    ).toBeTruthy()
    expect(
      screen.getByRole("link", { name: "app.nav.tabs.apiKeys" })
    ).toBeTruthy()
  })

  it("opens Advanced by itself while one of its pages is open", () => {
    renderSidebar("/settings/secret-api-keys")
    expect(
      screen.getByRole("link", { name: "app.nav.tabs.apiKeys" })
    ).toBeTruthy()
  })

  it("has no Developer or My account groups, and no profile", () => {
    renderSidebar()
    expect(screen.queryByText("app.nav.settings.developer")).toBeNull()
    expect(screen.queryByText("app.nav.settings.myAccount")).toBeNull()
    expect(screen.queryByRole("link", { name: "profile.domain" })).toBeNull()
  })

  it("narrows to the matching pages as the merchant types, folded ones too", () => {
    renderSidebar()
    const search = screen.getByRole("searchbox", {
      name: "app.nav.settings.search",
    })

    fireEvent.change(search, { target: { value: "workflow" } })

    expect(links()).toEqual([
      "app.nav.settings.header",
      "workflowExecutions.domain",
    ])
    expect(screen.queryByText("app.nav.settings.store")).toBeNull()

    fireEvent.change(search, { target: { value: "" } })
    expect(screen.getByText("app.nav.settings.store")).toBeTruthy()
  })

  it("clears the search once the merchant opens a result", () => {
    renderSidebar()
    const search = screen.getByRole("searchbox", {
      name: "app.nav.settings.search",
    })
    fireEvent.change(search, { target: { value: "notif" } })
    fireEvent.click(screen.getByRole("link", { name: "Notificaciones" }))

    expect((search as HTMLInputElement).value).toBe("")
    expect(screen.getByText("app.nav.settings.store")).toBeTruthy()
  })
})

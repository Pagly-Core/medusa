// @vitest-environment jsdom
import { TooltipProvider } from "@medusajs/ui"
import { cleanup, render, screen, within } from "@testing-library/react"
import { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

type MenuItem = {
  label: string
  to: string
  nested?: string
  items?: { label: string; to: string }[]
}

let menu: MenuItem[] = []

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock("../../../../providers/keybind-provider/hooks", () => ({
  useGlobalShortcuts: () => [],
}))

vi.mock("../../../../providers/extension-provider", () => ({
  useExtension: () => ({ getMenu: () => menu }),
}))

// The composer itself is not under test: render each section's entries in
// order, tagged with their ids, so the spec sees what the sidebar hands it.
vi.mock("../../../layout-composer", () => {
  const Entry = ({ id, children }: { id: string; children: ReactNode }) => (
    <div data-entry-id={id}>{children}</div>
  )
  const LayoutComposer = ({
    sections,
  }: {
    sections: Record<string, ReactNode>
  }) => <div>{sections.main}</div>
  return { LayoutComposer: Object.assign(LayoutComposer, { Entry }) }
})

vi.mock("../../../../hooks/api", () => ({ useLogout: () => ({}) }))
vi.mock("../../../../hooks/api/store", () => ({ useStore: () => ({}) }))
vi.mock("../../../../lib/query-client", () => ({ queryClient: {} }))
vi.mock("../../../../providers/search-provider", () => ({
  useSearch: () => ({ toggleSearch: () => {} }),
}))
vi.mock("../../user-menu", () => ({ UserMenu: () => null }))
vi.mock("../../shell", () => ({ Shell: () => null }))

import { LayoutEditContext } from "../../../../providers/layout-edit-provider/layout-edit-context"
import { SidebarRoutes } from "../main-layout"
import { SALES_CHANNEL_PATHS } from "../sales-channel-paths"

const HEADING = "app.nav.salesChannels"

const onlineStore: MenuItem = {
  label: "Tienda online",
  to: "/online-store",
  items: [{ label: "Preferencias", to: "/online-store/preferences" }],
}
const agents: MenuItem = {
  label: "Agentes",
  to: "/agents",
  items: [{ label: "Base de conocimiento", to: "/agents/knowledge-base" }],
}
const finances: MenuItem = { label: "Finanzas", to: "/finances" }
const content: MenuItem = { label: "Contenido", to: "/content" }

const renderSidebar = (items: MenuItem[], pathname = "/orders") => {
  menu = items
  return render(
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
          <SidebarRoutes />
        </LayoutEditContext.Provider>
      </TooltipProvider>
    </MemoryRouter>
  )
}

const entryIds = (container: HTMLElement) =>
  Array.from(container.querySelectorAll("[data-entry-id]")).map((el) =>
    el.getAttribute("data-entry-id")
  )

afterEach(() => {
  cleanup()
  menu = []
})

/**
 * Pagly: the plugin's sales channels (Online store, Agents) render last in the
 * main sidebar, under a "Sales channels" heading.
 */
describe("the sales channels group in the main sidebar", () => {
  it("lists the online store, then agents", () => {
    expect(SALES_CHANNEL_PATHS).toEqual(["/online-store", "/agents"])
  })

  it("renders the heading after the other extensions, with both channels under it in list order", () => {
    // Plugin order differs from the list's on purpose.
    const { container } = renderSidebar([agents, finances, onlineStore, content])

    expect(screen.getByText(HEADING)).toBeTruthy()

    const ids = entryIds(container)
    const heading = ids.indexOf("SalesChannels")
    expect(heading).toBeGreaterThan(-1)
    expect(ids.slice(heading)).toEqual([
      "SalesChannels",
      "nav:/online-store",
      "nav:/agents",
    ])
    expect(ids.indexOf("nav:/finances")).toBeLessThan(heading)
    expect(ids.indexOf("nav:/content")).toBeLessThan(heading)
    expect(ids.indexOf("nav:/price-lists")).toBeLessThan(heading)
  })

  it("renders the heading when only one channel is installed", () => {
    const { container } = renderSidebar([finances, agents])

    expect(screen.getByText(HEADING)).toBeTruthy()
    expect(entryIds(container).slice(-2)).toEqual(["SalesChannels", "nav:/agents"])
  })

  it("renders no heading when no channel is installed", () => {
    const { container } = renderSidebar([finances, content])

    expect(screen.queryByText(HEADING)).toBeNull()
    expect(entryIds(container)).not.toContain("SalesChannels")
    expect(entryIds(container).slice(-2)).toEqual([
      "nav:/finances",
      "nav:/content",
    ])
  })

  it("keeps the other extensions in the flat list, in plugin order", () => {
    const { container } = renderSidebar([content, onlineStore, finances])

    const ids = entryIds(container)
    expect(ids.indexOf("nav:/content")).toBe(ids.indexOf("nav:/price-lists") + 1)
    expect(ids.indexOf("nav:/finances")).toBe(ids.indexOf("nav:/content") + 1)
    expect(screen.getByRole("link", { name: "Finanzas" })).toBeTruthy()
    expect(screen.getByRole("link", { name: "Contenido" })).toBeTruthy()
  })

  it.each([
    ["/agents", "/agents/knowledge-base", "Base de conocimiento"],
    ["/online-store", "/online-store/preferences", "Preferencias"],
  ])("still renders %s's nested page under it", (to, pathname, label) => {
    const { container } = renderSidebar([onlineStore, agents], pathname)

    const entry = container.querySelector(
      `[data-entry-id="nav:${to}"]`
    ) as HTMLElement
    expect(within(entry).getByRole("link", { name: label })).toBeTruthy()
  })
})

/**
 * Pagly: categories, options, types and tags share one Organization entry
 * under Products.
 */
describe("the products entry in the main sidebar", () => {
  it("nests Collections, then Organization", () => {
    const { container } = renderSidebar([], "/products")

    const entry = container.querySelector(
      '[data-entry-id="nav:/products"]'
    ) as HTMLElement
    const nested = within(entry)
      .getAllByRole("link")
      .map((link) => [link.textContent, link.getAttribute("href")])
    expect(nested).toEqual(
      expect.arrayContaining([
        ["collections.domain", "/collections"],
        ["app.nav.tabs.organization", "/categories"],
      ])
    )
    expect(nested.map((n) => n[0])).not.toContain("categories.domain")
    expect(nested.map((n) => n[0])).not.toContain("productOptions.domain")
  })

  it("stays open on a tab's page", () => {
    const { container } = renderSidebar([], "/product-tags")

    const entry = container.querySelector(
      '[data-entry-id="nav:/products"]'
    ) as HTMLElement
    expect(
      within(entry).getAllByRole("link", { name: "app.nav.tabs.organization" })
        .length
    ).toBeGreaterThan(0)
  })
})

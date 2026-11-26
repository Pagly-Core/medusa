// @vitest-environment jsdom
import { TooltipProvider } from "@medusajs/ui"
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock("../../../../providers/keybind-provider/hooks", () => ({
  useGlobalShortcuts: () => [],
}))

import { LayoutEditContext } from "../../../../providers/layout-edit-provider/layout-edit-context"
import { NavItem } from "../nav-item"

const NAV_ACTIONS_KEY = "__paglyNavActions"

const StoreActions = () => <button type="button">store actions</button>

const register = (actions: Record<string, unknown>) => {
  ;(globalThis as Record<string, unknown>)[NAV_ACTIONS_KEY] = actions
}

const renderItem = (to: string, { editMode = false } = {}) =>
  render(
    <MemoryRouter initialEntries={["/orders"]}>
      <TooltipProvider>
        <LayoutEditContext.Provider
          value={{
            editMode,
            orderChildren: (children) => children,
            setChildrenOrder: () => {},
            isHidden: () => false,
            toggleHidden: () => {},
          }}
        >
          <NavItem label="Online store" to={to} type="extension" />
        </LayoutEditContext.Provider>
      </TooltipProvider>
    </MemoryRouter>
  )

afterEach(() => {
  cleanup()
  delete (globalThis as Record<string, unknown>)[NAV_ACTIONS_KEY]
})

describe("NavItem actions a plugin registers", () => {
  it("renders the actions registered for its route next to the link", () => {
    register({ "/online-store": StoreActions })

    renderItem("/online-store")

    const link = screen.getByRole("link", { name: "Online store" })
    const actions = screen.getByRole("button", { name: "store actions" })
    // Beside the link, not inside it, so clicking one never follows the link.
    expect(link.contains(actions)).toBe(false)
    expect(link.parentElement?.parentElement?.contains(actions)).toBe(true)
  })

  it("renders nothing extra for a route with no actions", () => {
    register({ "/online-store": StoreActions })

    renderItem("/orders")

    expect(screen.queryByRole("button", { name: "store actions" })).toBeNull()
  })

  it("renders nothing extra when no plugin registered any", () => {
    renderItem("/online-store")

    expect(screen.getByRole("link", { name: "Online store" })).toBeTruthy()
    expect(screen.queryByRole("button", { name: "store actions" })).toBeNull()
  })

  it("hides them while the layout is being edited", () => {
    register({ "/online-store": StoreActions })

    renderItem("/online-store", { editMode: true })

    expect(screen.queryByRole("button", { name: "store actions" })).toBeNull()
  })
})

/**
 * Pagly: a nav entry that stands for a tab group (Products › Organization)
 * stays highlighted on every tab of the group.
 */
describe("NavItem for a tab group", () => {
  const renderProductsAt = (pathname: string) =>
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
            <NavItem
              label="Products"
              to="/products"
              items={[
                { label: "Collections", to: "/collections" },
                { label: "Organization", to: "/categories" },
              ]}
            />
          </LayoutEditContext.Provider>
        </TooltipProvider>
      </MemoryRouter>
    )

  const isHighlighted = (name: string) =>
    screen
      .getAllByRole("link", { name })
      .some((link) => link.classList.contains("bg-ui-bg-base"))

  it.each(["/categories", "/product-options", "/product-types/ptyp_01", "/product-tags"])(
    "highlights Organization, not Products, on %s",
    (pathname) => {
      renderProductsAt(pathname)
      expect(isHighlighted("Organization")).toBe(true)
      expect(isHighlighted("Products")).toBe(false)
      expect(isHighlighted("Collections")).toBe(false)
    }
  )
})

const renderOrdersAt = (pathname: string) =>
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
          <NavItem label="Orders" to="/orders" />
        </LayoutEditContext.Provider>
      </TooltipProvider>
    </MemoryRouter>
  )

/**
 * Pagly: on the sidebar's grey frame the current page is a white pill with a
 * hairline edge and no drop shadow, and rows are 32px with 8px corners.
 */
describe("NavItem on the sidebar's frame", () => {
  it("marks the current page with a white pill and no drop shadow", () => {
    renderOrdersAt("/orders")
    const link = screen.getByRole("link", { name: "Orders" })
    expect(link.classList).toContain("bg-ui-bg-base")
    expect(link.classList).toContain("text-ui-fg-base")
    expect(link.classList).not.toContain("shadow-elevation-card-rest")
  })

  it("is a 32px row with 8px corners", () => {
    renderOrdersAt("/products")
    const link = screen.getByRole("link", { name: "Orders" })
    expect(link.classList).toContain("h-8")
    expect(link.classList).toContain("rounded-lg")
  })

  it("darkens on hover by a step the frame can show", () => {
    renderOrdersAt("/products")
    const link = screen.getByRole("link", { name: "Orders" })
    // The old hover was the frame's own grey, so it showed nothing.
    expect(link.classList).toContain("hover:bg-ui-bg-subtle-pressed")
    expect(link.classList).not.toContain("hover:bg-ui-bg-subtle-hover")
  })
})

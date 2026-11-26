// @vitest-environment jsdom
import { TooltipProvider } from "@medusajs/ui"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { PropsWithChildren, ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

const sidebar = { desktop: true, mobile: false, toggle: vi.fn() }
let canReadStore = true

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock("../../../../providers/keybind-provider/hooks", () => ({
  useGlobalShortcuts: () => [],
}))
vi.mock("../../../../providers/extension-provider", () => ({
  useExtension: () => ({ getMenu: () => [] }),
}))
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
vi.mock("../../../../hooks/api/store", () => ({
  useStore: () => ({
    store: { name: "Tits" },
    isPending: false,
    isError: false,
    error: null,
  }),
}))
vi.mock("../../../../hooks/use-sign-out", () => ({
  useSignOut: () => () => {},
}))
vi.mock("../../../../lib/query-client", () => ({ queryClient: {} }))
vi.mock("../../../../providers/search-provider", () => ({
  useSearch: () => ({ toggleSearch: () => {} }),
}))
vi.mock("../../../../providers/sidebar-provider", () => ({
  useSidebar: () => sidebar,
}))
vi.mock("../../../common/permission-guard", () => ({
  PermissionGuard: ({ children }: PropsWithChildren) =>
    canReadStore ? <>{children}</> : null,
}))
vi.mock("../../user-menu", () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}))
vi.mock("../../shell", () => ({
  Shell: ({ children }: PropsWithChildren) => <>{children}</>,
}))

import { LayoutEditContext } from "../../../../providers/layout-edit-provider/layout-edit-context"
import { MainLayout } from "../main-layout"

const renderSidebar = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
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
          <MainLayout />
        </LayoutEditContext.Provider>
      </TooltipProvider>
    </MemoryRouter>
  )

const storeTrigger = () => screen.getByRole("button", { name: /Tits/ })

const hideButton = () =>
  screen.getByRole("button", { name: "app.nav.sidebar.hide" })

afterEach(() => {
  cleanup()
  canReadStore = true
  sidebar.toggle.mockReset()
})

/**
 * Pagly: the main sidebar's header shows the Pagly logo where the store's
 * initial was, next to the store's name, and opens the store's menu.
 */
describe("the main sidebar's header", () => {
  it("shows the Pagly logo and the store's name as the store menu's trigger", () => {
    renderSidebar()
    const trigger = storeTrigger()
    expect(within(trigger).getByRole("img", { name: "Pagly" })).toBeTruthy()
    expect(within(trigger).getByText("Tits")).toBeTruthy()
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu")
    // The store's initial in a grey square is gone.
    expect(within(trigger).queryByText("T")).toBeNull()
  })

  it("opens the store menu, headed by the logo, with the store settings and sign out", async () => {
    renderSidebar()
    fireEvent.keyDown(storeTrigger(), { key: "ArrowDown" })

    const menu = await screen.findByRole("menu")
    expect(within(menu).getByRole("img", { name: "Pagly" })).toBeTruthy()
    expect(
      within(menu).getByRole("menuitem", { name: "app.nav.main.storeSettings" })
    ).toBeTruthy()
    expect(
      within(menu).getByRole("menuitem", { name: "app.menus.actions.logout" })
    ).toBeTruthy()
  })

  it("hides the desktop sidebar from a button beside the store", () => {
    renderSidebar()
    const button = hideButton()
    // Desktop only: on a phone the sidebar is a sheet with its own close button.
    expect(button.classList).toContain("hidden")
    expect(button.classList).toContain("lg:flex")
    fireEvent.click(button)
    expect(sidebar.toggle).toHaveBeenCalledWith("desktop")
  })

  it("keeps the hide button for someone who cannot read the store", () => {
    canReadStore = false
    renderSidebar()
    expect(screen.queryByRole("button", { name: /Tits/ })).toBeNull()
    expect(hideButton()).toBeTruthy()
  })

  it("stays on the frame's colour while the list scrolls under it", () => {
    renderSidebar()
    const band = storeTrigger().closest(".sticky") as HTMLElement
    expect(band).toBeTruthy()
    expect(band.classList).toContain("bg-[#F4F4F5]")
    expect(band.classList).toContain("dark:bg-[#111113]")
  })
})

describe("the main sidebar's body", () => {
  it("draws no dashed lines between the header, the list and the user", () => {
    const { container } = renderSidebar()
    expect(container.querySelectorAll('[role="separator"]')).toHaveLength(0)
  })

  it("sets search as a white field with an edge", () => {
    renderSidebar()
    const search = screen.getByRole("button", { name: /app\.search\.label/ })
    expect(search.classList).toContain("bg-ui-bg-base")
    expect(search.classList).toContain("border")
    expect(search.classList).toContain("border-ui-border-base")
  })

  it("keeps the user's row at the foot, on the frame's colour", () => {
    renderSidebar()
    const band = screen
      .getByTestId("user-menu")
      .closest(".sticky") as HTMLElement
    expect(band).toBeTruthy()
    expect(band.classList).toContain("bg-[#F4F4F5]")
  })
})

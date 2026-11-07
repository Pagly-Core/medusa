// @vitest-environment jsdom
import { TooltipProvider } from "@medusajs/ui"
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

/**
 * Pagly: the admin has no keyboard shortcuts: no shortcut hints on the
 * sidebar and no "Atajos" item in the user menu.
 */

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock("../../../hooks/api", () => ({
  useMe: () => ({
    user: { email: "fresh@pagly.test" },
    isPending: false,
    isError: false,
    error: null,
  }),
  useLogout: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock("../../../hooks/api/auth", () => ({
  useLogout: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock("../../../lib/query-client", () => ({
  queryClient: { clear: vi.fn() },
}))

vi.mock("../../../providers/theme-provider", () => ({
  useTheme: () => ({ theme: "system", setTheme: vi.fn() }),
}))

import { LayoutEditContext } from "../../../providers/layout-edit-provider/layout-edit-context"
import { NavItem } from "../nav-item"
import { UserMenu } from "../user-menu"

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe("admin keyboard shortcuts are gone", () => {
  it("shows no shortcut hint on a sidebar link", async () => {
    vi.useFakeTimers()

    render(
      <MemoryRouter initialEntries={["/orders"]}>
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
            <NavItem label="Price lists" to="/price-lists" />
          </LayoutEditContext.Provider>
        </TooltipProvider>
      </MemoryRouter>
    )

    const link = screen.getByRole("link", { name: "Price lists" })
    fireEvent.pointerMove(link)
    fireEvent.focus(link)
    await act(async () => {
      vi.advanceTimersByTime(3000)
    })

    expect(
      screen.queryAllByText("app.keyboardShortcuts.navigation.goToPriceLists")
    ).toHaveLength(0)
    expect(screen.queryAllByText("app.keyboardShortcuts.then")).toHaveLength(0)
  })

  it("has no shortcuts item in the user menu", async () => {
    render(
      <MemoryRouter>
        <UserMenu />
      </MemoryRouter>
    )

    const trigger = screen.getByRole("button", { name: /fresh@pagly\.test/ })
    fireEvent.keyDown(trigger, { key: "ArrowDown" })

    expect(
      await screen.findByText("app.menus.user.profileSettings")
    ).toBeTruthy()
    expect(screen.queryByText("app.menus.user.shortcuts")).toBeNull()
  })
})

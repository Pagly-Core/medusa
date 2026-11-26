// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from "@testing-library/react"
import { PropsWithChildren, ReactNode } from "react"
import { RouterProvider, createMemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

/** The sidebar's state, held outside React so a spec can change it mid-render. */
let sidebarState = { desktop: true, mobile: false }
const listeners = new Set<() => void>()
const setSidebar = (patch: Partial<typeof sidebarState>) => {
  sidebarState = { ...sidebarState, ...patch }
  listeners.forEach((listener) => listener())
}
const toggle = vi.fn()

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock("../../../../providers/keybind-provider", () => ({
  KeybindProvider: ({ children }: PropsWithChildren) => <>{children}</>,
}))
vi.mock("../../../../providers/keybind-provider/hooks", () => ({
  useGlobalShortcuts: () => [],
}))
vi.mock("../../../../providers/sidebar-provider", async () => {
  const { useSyncExternalStore } = await import("react")
  const subscribe = (listener: () => void) => {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }
  return {
    useSidebar: () => ({
      ...useSyncExternalStore(subscribe, () => sidebarState),
      toggle,
    }),
  }
})
vi.mock("../../../../hooks/use-document-title", () => ({
  DocumentTitle: () => null,
}))
vi.mock(
  "../../../../providers/customizer-host-provider/customizer-host-provider",
  () => ({
    LayoutCustomizerHostProvider: ({ children }: PropsWithChildren) => (
      <>{children}</>
    ),
    LayoutCustomizerSlot: () => null,
  })
)
vi.mock("../../notifications", () => ({ Notifications: () => null }))
vi.mock("../../../layout-composer", () => ({
  CustomizerMenu: () => null,
  LayoutComposer: Object.assign(() => null, { Entry: () => null }),
}))

import { SidebarCollapseButton } from "../../sidebar-collapse-button"
import { Shell } from "../shell"

const renderShell = (
  sidebar: ReactNode = <aside data-testid="sidebar" />,
  page: ReactNode = <div data-testid="page" />
) => {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: <Shell>{sidebar}</Shell>,
        children: [{ index: true, element: page }],
      },
    ],
    { initialEntries: ["/"] }
  )
  return render(<RouterProvider router={router} />)
}

/** Whether a stacking context sits between this element and the body. */
const isolatedBelowBody = (element: HTMLElement) => {
  for (
    let node = element.parentElement;
    node && node !== document.body;
    node = node.parentElement
  ) {
    if (node.classList.contains("isolate")) {
      return true
    }
  }
  return false
}

/** The column that holds the top bar and the page: the sheet. */
const sheet = () => screen.getByRole("main").parentElement as HTMLElement

/** The window behind the sidebar and the sheet: the frame. */
const frame = () => screen.getByRole("main").closest(".isolate") as HTMLElement

const showSidebarButtons = () =>
  screen.queryAllByRole("button", { name: "app.nav.sidebar.show" })

/** The top bar's desktop button, there only while the sidebar is hidden. */
const desktopShowButton = () =>
  showSidebarButtons().find((button) => button.classList.contains("lg:flex"))

afterEach(() => {
  cleanup()
  sidebarState = { desktop: true, mobile: false }
  toggle.mockReset()
})

describe("the shell", () => {
  // Drawer and modal overlays portal to the body with no z-index. Anything in
  // the shell with a z-index (the settings search's sticky header, a sticky
  // table header) would paint over them unless the shell is its own stacking
  // context.
  it("keeps the sidebars and the page under portaled overlays", () => {
    renderShell()
    for (const sidebar of screen.getAllByTestId("sidebar")) {
      expect(isolatedBelowBody(sidebar)).toBe(true)
    }
    expect(isolatedBelowBody(screen.getByTestId("page"))).toBe(true)
  })
})

/**
 * Pagly: the sidebar sits on a grey frame and the page on a sheet inset from
 * the window, one step lighter, with a 1px edge and round corners. The sheet
 * keeps the page ground every page was built on, so pages look as before.
 */
describe("the frame and the sheet", () => {
  it("paints the frame one step darker than the page, in both themes", () => {
    renderShell()
    expect(frame().classList).toContain("bg-[#F4F4F5]")
    expect(frame().classList).toContain("dark:bg-[#111113]")
  })

  it("sets the top bar and the page on a sheet with the page ground, an edge and round corners on desktop", () => {
    renderShell()
    const classes = sheet().classList
    expect(classes).toContain("bg-ui-bg-subtle")
    expect(classes).toContain("lg:border")
    expect(classes).toContain("lg:border-ui-border-base")
    expect(classes).toContain("lg:rounded-xl")
    expect(classes).toContain("lg:my-2")
    expect(classes).toContain("lg:me-2")
  })

  it("leaves no rule between the sidebar and the frame, and widens the sidebar to 240px", () => {
    renderShell()
    const container = screen.getByTestId("sidebar").parentElement as HTMLElement
    expect(container.classList).toContain("w-[240px]")
    expect(container.classList).not.toContain("border-e")
  })

  it("insets the sheet from the window's left edge too once the sidebar is hidden", () => {
    setSidebar({ desktop: false })
    renderShell()
    expect(sheet().classList).toContain("lg:ms-2")
  })

  it("does not inset the sheet on the left while the sidebar is beside it", () => {
    renderShell()
    expect(sheet().classList).not.toContain("lg:ms-2")
  })
})

/**
 * Pagly: the sidebar hides itself from a button in its own header, so the top
 * bar offers the desktop button that brings it back only while it is hidden.
 * The phone's button, which opens the sidebar as a sheet, is always there.
 */
describe("the top bar's sidebar button", () => {
  it("offers only the phone's button while the desktop sidebar is shown", () => {
    renderShell()
    const buttons = showSidebarButtons()
    expect(buttons).toHaveLength(1)
    expect(buttons[0].classList).toContain("max-lg:flex")
  })

  it("brings the desktop sidebar back while it is hidden", () => {
    setSidebar({ desktop: false })
    renderShell()
    const desktop = desktopShowButton()
    expect(desktop).toBeTruthy()
    desktop!.click()
    expect(toggle).toHaveBeenCalledWith("desktop")
  })

  // An empty wrapper is still a flex item, so the cell's gap pushed the
  // breadcrumbs 6px off the page's edge while the sidebar was shown.
  it("puts its buttons straight in the top bar's cell, with no wrapper before the breadcrumbs", () => {
    renderShell()
    const phone = showSidebarButtons()[0]
    expect(phone.parentElement?.classList).toContain("gap-x-1.5")
  })
})

/**
 * Pagly: the button that hides the sidebar lives in the sidebar and the one
 * that brings it back in the top bar, so focus follows from one to the other
 * instead of falling to the page's body.
 */
describe("focus as the sidebar hides and comes back", () => {
  const renderWithHideButton = () =>
    renderShell(
      <aside data-testid="sidebar">
        <button type="button" data-sidebar-collapse="">
          hide
        </button>
      </aside>,
      <button type="button">page action</button>
    )

  it("moves to the top bar's button when the sidebar hides with focus in it", () => {
    renderWithHideButton()
    screen.getByRole("button", { name: "hide" }).focus()

    act(() => setSidebar({ desktop: false }))

    expect(document.activeElement).toBe(desktopShowButton())
  })

  it("moves to the sidebar's hide button when the top bar's button brings it back", () => {
    setSidebar({ desktop: false })
    renderWithHideButton()
    desktopShowButton()!.focus()

    act(() => setSidebar({ desktop: true }))

    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "hide" })
    )
  })

  it("stays where it is when it is elsewhere on the page", () => {
    renderWithHideButton()
    const action = screen.getByRole("button", { name: "page action" })
    action.focus()

    act(() => setSidebar({ desktop: false }))

    expect(document.activeElement).toBe(action)
  })
})

/**
 * Pagly: the phone's sheet closes with its own button. The desktop hide button
 * stays out of it, or a window widened while the sheet is open would show a
 * button that hides the sidebar behind the sheet instead of closing it.
 */
describe("the hide button and the phone's sheet", () => {
  it("is left out of the phone's sheet and kept in the desktop sidebar", () => {
    setSidebar({ mobile: true })
    renderShell(<SidebarCollapseButton />)

    const dialog = screen.getByRole("dialog")
    expect(
      within(dialog).queryByRole("button", { name: "app.nav.sidebar.hide" })
    ).toBeNull()
    expect(
      screen.getAllByRole("button", {
        name: "app.nav.sidebar.hide",
        hidden: true,
      })
    ).toHaveLength(1)
  })
})

// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { PropsWithChildren } from "react"
import { RouterProvider, createMemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

const sidebar = { desktop: true, mobile: false, toggle: vi.fn() }

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock("../../../../providers/keybind-provider", () => ({
  KeybindProvider: ({ children }: PropsWithChildren) => <>{children}</>,
}))
vi.mock("../../../../providers/keybind-provider/hooks", () => ({
  useGlobalShortcuts: () => [],
}))
vi.mock("../../../../providers/sidebar-provider", () => ({
  useSidebar: () => sidebar,
}))
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

import { Shell } from "../shell"

const renderShell = () => {
  const router = createMemoryRouter(
    [
      {
        path: "/",
        element: (
          <Shell>
            <aside data-testid="sidebar" />
          </Shell>
        ),
        children: [{ index: true, element: <div data-testid="page" /> }],
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

afterEach(() => {
  cleanup()
  sidebar.desktop = true
  sidebar.mobile = false
  sidebar.toggle.mockReset()
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
    sidebar.desktop = false
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
    sidebar.desktop = false
    renderShell()
    const desktop = showSidebarButtons().find((button) =>
      button.classList.contains("lg:flex")
    )
    expect(desktop).toBeTruthy()
    desktop!.click()
    expect(sidebar.toggle).toHaveBeenCalledWith("desktop")
  })
})

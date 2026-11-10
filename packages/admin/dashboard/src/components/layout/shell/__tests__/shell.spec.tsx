// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { PropsWithChildren } from "react"
import { RouterProvider, createMemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

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
  useSidebar: () => ({ desktop: true, mobile: false, toggle: () => {} }),
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

afterEach(cleanup)

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

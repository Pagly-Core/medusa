// @vitest-environment jsdom
import { TooltipProvider } from "@medusajs/ui"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { ReactNode } from "react"
import { QueryClientProvider } from "@tanstack/react-query"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
vi.mock("../../../../providers/keybind-provider/hooks", () => ({
  useGlobalShortcuts: () => [],
}))
vi.hoisted(() => {
  const g = global as any
  g.__BACKEND_URL__ = "http://localhost:9000"
  g.__AUTH_TYPE__ = "session"
  g.__JWT_TOKEN_STORAGE_KEY__ = ""
})

// A store on the cloud: the platform answers 403 to the search indexes.
const listIndexes = vi.hoisted(() => vi.fn())
vi.mock("../../../../lib/client", () => ({
  sdk: { admin: { search: { listIndexes } } },
}))
vi.mock("../../../../providers/feature-flag-provider", () => ({
  useFeatureFlag: () => false,
}))
vi.mock("../../../../providers/permissions-provider", () => ({
  usePermissions: () => ({ hasPermission: () => true }),
}))

const pluginPages: { label: string; to: string }[] = []
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
vi.mock("../../user-menu", () => ({
  UserMenu: () => <div data-testid="user-menu" />,
}))
const sidebar = { desktop: true, mobile: false, toggle: vi.fn() }
vi.mock("../../../../providers/sidebar-provider", () => ({
  useSidebar: () => sidebar,
}))
vi.mock("../../shell", () => ({ Shell: () => null }))

import { LayoutEditContext } from "../../../../providers/layout-edit-provider/layout-edit-context"
import { queryClient } from "../../../../lib/query-client"
import { SettingsSidebar } from "../settings-layout"

const renderSidebar = (pathname = "/settings/store") =>
  render(
    <QueryClientProvider client={queryClient}>
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
    </QueryClientProvider>
  )

afterEach(() => {
  cleanup()
})

// Pagly-Core/pagly-app#252: every Settings page asked for the search indexes,
// twice (a retry), and a store got two 403s in the console each time.
describe("the settings sidebar on a store without search", () => {
  it("asks for the search indexes once, and not again on the next page", async () => {
    listIndexes.mockRejectedValue(
      Object.assign(new Error("restricted to platform admins"), { status: 403 })
    )

    renderSidebar("/settings/store")
    await waitFor(() => expect(listIndexes).toHaveBeenCalled())
    // The dashboard retries a failed query once, a second later.
    await new Promise((resolve) => setTimeout(resolve, 1500))
    cleanup()
    renderSidebar("/settings/users")
    await new Promise((resolve) => setTimeout(resolve, 1500))

    expect(listIndexes).toHaveBeenCalledTimes(1)
    expect(screen.queryByText("searchIndexes.domain")).toBeNull()
  }, 10000)
})

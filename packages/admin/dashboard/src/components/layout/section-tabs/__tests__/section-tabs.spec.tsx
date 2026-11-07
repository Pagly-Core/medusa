// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { afterEach, describe, expect, test, vi } from "vitest"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

import { SectionTabsLayout } from "../section-tabs"

afterEach(cleanup)

const Where = () => <p data-testid="where">{useLocation().pathname}</p>

const renderAt = (pathname: string) =>
  render(
    <MemoryRouter initialEntries={[pathname]}>
      <Routes>
        <Route path="*" element={<SectionTabsLayout />}>
          <Route path="*" element={<Where />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )

const tabLabels = () => screen.getAllByRole("tab").map((tab) => tab.textContent)

describe("the section tabs", () => {
  test("show every tab of the page's group, in order", () => {
    renderAt("/product-tags")
    expect(tabLabels()).toEqual([
      "categories.domain",
      "productOptions.domain",
      "app.nav.tabs.types",
      "app.nav.tabs.tags",
    ])
  })

  test("select the current page's tab", () => {
    renderAt("/product-tags")
    const selected = screen
      .getAllByRole("tab")
      .filter((tab) => tab.getAttribute("aria-selected") === "true")
    expect(selected.map((tab) => tab.textContent)).toEqual([
      "app.nav.tabs.tags",
    ])
  })

  test("render the page under them", () => {
    renderAt("/settings/refund-reasons")
    expect(screen.getByTestId("where").textContent).toBe(
      "/settings/refund-reasons"
    )
    expect(tabLabels()).toEqual([
      "app.nav.tabs.returnReasons",
      "app.nav.tabs.refundReasons",
    ])
  })

  test("are tabs that go to their page", () => {
    renderAt("/categories")
    const types = screen.getByRole("tab", { name: "app.nav.tabs.types" })
    fireEvent.mouseDown(types, { button: 0 })
    fireEvent.click(types)
    expect(screen.getByTestId("where").textContent).toBe("/product-types")
  })

  test("are absent outside every group", () => {
    renderAt("/collections")
    expect(screen.queryAllByRole("tab")).toHaveLength(0)
    expect(screen.getByTestId("where").textContent).toBe("/collections")
  })

  test("are links, so a tab opens in a new browser tab", () => {
    renderAt("/categories")
    const types = screen.getByRole("tab", { name: "app.nav.tabs.types" })
    expect(types.tagName).toBe("A")
    expect(types.getAttribute("href")).toBe("/product-types")
  })

  test("stay on the page while the arrow keys move between them", () => {
    renderAt("/categories")
    const categories = screen.getByRole("tab", { name: "categories.domain" })
    categories.focus()
    fireEvent.keyDown(categories, { key: "ArrowRight" })
    expect(screen.getByTestId("where").textContent).toBe("/categories")
  })
})

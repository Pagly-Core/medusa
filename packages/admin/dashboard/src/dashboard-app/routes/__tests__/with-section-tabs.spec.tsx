import { RouteObject } from "react-router-dom"
import { describe, expect, test } from "vitest"

import { SectionTabsLayout } from "../../../components/layout/section-tabs"
import { withSectionTabs } from "../with-section-tabs"

const list = { path: "", id: "list", children: [{ path: "create" }] }
const detail = { path: ":id", id: "detail" }

const tree = (): RouteObject[] => [
  {
    children: [
      { path: "/categories", children: [{ ...list }, { ...detail }] },
      { path: "/collections", children: [{ ...list }, { ...detail }] },
      {
        path: "/settings",
        children: [
          { path: "refund-reasons", children: [{ ...list }] },
          { path: "regions", children: [{ ...list }] },
        ],
      },
    ],
  },
]

const isTabsLayout = (route?: RouteObject) =>
  (route?.element as any)?.type === SectionTabsLayout

describe("withSectionTabs", () => {
  const routes = withSectionTabs(tree())
  const main = routes[0].children!

  test("puts the tab bar above a tab's list, keeping the list and its modals", () => {
    const categories = main[0].children!
    expect(isTabsLayout(categories[0])).toBe(true)
    expect(categories[0].path).toBe("")
    expect(categories[0].children).toEqual([list])
  })

  test("leaves the tab's detail pages without it", () => {
    expect(main[0].children![1]).toEqual(detail)
  })

  test("finds tabs nested under a parent path", () => {
    const refunds = main[2].children![0].children!
    expect(isTabsLayout(refunds[0])).toBe(true)
  })

  test("leaves pages outside every group alone", () => {
    expect(main[1].children).toEqual([list, detail])
    expect(main[2].children![1].children).toEqual([list])
  })
})

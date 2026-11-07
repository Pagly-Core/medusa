import { describe, expect, test } from "vitest"

import {
  findTabGroup,
  findTabGroupByLeader,
  getActivePaths,
  isFollowerTab,
  TAB_GROUPS,
} from "../tab-groups"

const shape = () =>
  TAB_GROUPS.map((group) => ({
    id: group.id,
    label: group.label,
    tabs: group.tabs.map((tab) => [tab.label, tab.to]),
  }))

describe("the tab groups", () => {
  test("are Organization, Returns and API keys, each with its tabs in order", () => {
    expect(shape()).toEqual([
      {
        id: "organization",
        label: "app.nav.tabs.organization",
        tabs: [
          ["categories.domain", "/categories"],
          ["productOptions.domain", "/product-options"],
          ["app.nav.tabs.types", "/product-types"],
          ["app.nav.tabs.tags", "/product-tags"],
        ],
      },
      {
        id: "returns",
        label: "app.nav.tabs.returns",
        tabs: [
          ["app.nav.tabs.returnReasons", "/settings/return-reasons"],
          ["app.nav.tabs.refundReasons", "/settings/refund-reasons"],
        ],
      },
      {
        id: "apiKeys",
        label: "app.nav.tabs.apiKeys",
        tabs: [
          ["app.nav.tabs.publishable", "/settings/publishable-api-keys"],
          ["app.nav.tabs.secret", "/settings/secret-api-keys"],
        ],
      },
    ])
  })

  test("never list one route twice", () => {
    const routes = TAB_GROUPS.flatMap((group) => group.tabs.map((t) => t.to))
    expect(new Set(routes).size).toBe(routes.length)
  })
})

describe("findTabGroup", () => {
  test("finds the group of a tab's list", () => {
    expect(findTabGroup("/product-tags")?.id).toBe("organization")
    expect(findTabGroup("/settings/refund-reasons")?.id).toBe("returns")
  })

  test("finds the group of a page under a tab", () => {
    expect(findTabGroup("/product-types/ptyp_01/edit")?.id).toBe(
      "organization"
    )
    expect(findTabGroup("/settings/secret-api-keys/create")?.id).toBe("apiKeys")
  })

  test("ignores routes that only share a prefix", () => {
    expect(findTabGroup("/categories-archive")).toBeUndefined()
    expect(findTabGroup("/products")).toBeUndefined()
    expect(findTabGroup("/collections")).toBeUndefined()
  })
})

describe("the group's nav entry", () => {
  test("is its first tab", () => {
    expect(findTabGroupByLeader("/categories")?.id).toBe("organization")
    expect(findTabGroupByLeader("/settings/return-reasons")?.id).toBe("returns")
    expect(findTabGroupByLeader("/product-tags")).toBeUndefined()
  })

  test("stays highlighted on every tab of its group", () => {
    expect(getActivePaths("/categories")).toEqual([
      "/categories",
      "/product-options",
      "/product-types",
      "/product-tags",
    ])
    expect(getActivePaths("/settings/publishable-api-keys")).toEqual([
      "/settings/publishable-api-keys",
      "/settings/secret-api-keys",
    ])
  })

  test("of a page outside every group is just that page", () => {
    expect(getActivePaths("/collections")).toEqual(["/collections"])
  })

  test("is the only one: the other tabs have none", () => {
    expect(isFollowerTab("/settings/refund-reasons")).toBe(true)
    expect(isFollowerTab("/settings/secret-api-keys")).toBe(true)
    expect(isFollowerTab("/product-options")).toBe(true)
    expect(isFollowerTab("/settings/return-reasons")).toBe(false)
    expect(isFollowerTab("/settings/store")).toBe(false)
  })
})

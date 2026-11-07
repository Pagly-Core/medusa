import { RouteObject } from "react-router-dom"

import {
  SectionTabsLayout,
  TAB_GROUPS,
} from "../../components/layout/section-tabs"

const TAB_PATHS = new Set(
  TAB_GROUPS.flatMap((group) => group.tabs.map((tab) => tab.to))
)

const join = (parent: string, path?: string) => {
  if (!path) {
    return parent
  }
  return path.startsWith("/") ? path : `${parent.replace(/\/$/, "")}/${path}`
}

/**
 * Pagly: puts the section tab bar (see `TAB_GROUPS`) above the list page of
 * every tab, so a tab's list, and the modals it opens, render under the bar
 * while its detail pages do not. Adding a tab to `TAB_GROUPS` is enough.
 */
export const withSectionTabs = (
  routes: RouteObject[],
  parent = ""
): RouteObject[] =>
  routes.map((route) => {
    const path = join(parent, route.path)
    if (!route.children) {
      return route
    }

    const children = TAB_PATHS.has(path)
      ? route.children.map((child) =>
          child.path === ""
            ? ({
                path: "",
                element: <SectionTabsLayout />,
                children: [child],
              } as RouteObject)
            : child
        )
      : withSectionTabs(route.children, path)

    return { ...route, children } as RouteObject
  })

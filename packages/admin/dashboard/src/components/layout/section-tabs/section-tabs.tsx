import { Tabs } from "@medusajs/ui"
import { useTranslation } from "react-i18next"
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"

import { findTab } from "./tab-groups"

/**
 * Pagly: the tab bar of the current page's tab group (see `TAB_GROUPS`), or
 * nothing outside every group. Each tab goes to its own list route, so a tab
 * is a URL and the browser's back button walks the tabs.
 */
export const SectionTabs = () => {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const current = findTab(pathname)

  if (!current) {
    return null
  }

  return (
    // Manual activation: arrow keys move focus without navigating (each tab's
    // page remounts this bar); links keep cmd-click and middle-click.
    <Tabs
      value={current.tab.to}
      onValueChange={(to) => navigate(to)}
      activationMode="manual"
    >
      <Tabs.List>
        {current.group.tabs.map((tab) => (
          <Tabs.Trigger key={tab.to} value={tab.to} asChild>
            <Link to={tab.to}>{t(tab.label as any)}</Link>
          </Tabs.Trigger>
        ))}
      </Tabs.List>
    </Tabs>
  )
}

/** Route element: the tab bar above the tab's list page. */
export const SectionTabsLayout = () => {
  return (
    <div className="flex flex-col gap-y-3">
      <SectionTabs />
      <Outlet />
    </div>
  )
}

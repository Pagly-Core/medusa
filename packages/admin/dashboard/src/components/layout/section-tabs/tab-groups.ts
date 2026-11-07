/**
 * Pagly: pages that share one nav entry and show as tabs of one section.
 *
 * Each group is one nav item (pointing at its first tab) and one tab bar on
 * every tab's list page. Adding a group or a tab is one entry here; the
 * sidebars, the active-link highlight and the tab bar all read this list.
 */
export type TabGroupTab = {
  /** i18n key of the tab's label. */
  label: string
  /** The tab's list route. */
  to: string
}

export type TabGroup = {
  id: string
  /** i18n key of the label the nav entry shows for the whole group. */
  label: string
  tabs: TabGroupTab[]
}

export const TAB_GROUPS: TabGroup[] = [
  {
    id: "organization",
    label: "app.nav.tabs.organization",
    tabs: [
      { label: "categories.domain", to: "/categories" },
      { label: "productOptions.domain", to: "/product-options" },
      { label: "app.nav.tabs.types", to: "/product-types" },
      { label: "app.nav.tabs.tags", to: "/product-tags" },
    ],
  },
  {
    id: "returns",
    label: "app.nav.tabs.returns",
    tabs: [
      { label: "app.nav.tabs.returnReasons", to: "/settings/return-reasons" },
      { label: "app.nav.tabs.refundReasons", to: "/settings/refund-reasons" },
    ],
  },
  {
    id: "apiKeys",
    label: "app.nav.tabs.apiKeys",
    tabs: [
      {
        label: "app.nav.tabs.publishable",
        to: "/settings/publishable-api-keys",
      },
      { label: "app.nav.tabs.secret", to: "/settings/secret-api-keys" },
    ],
  },
]

/** `pathname` is `to` or a page under it (segment boundaries respected). */
export const isUnder = (pathname: string, to: string) =>
  pathname === to || pathname.startsWith(to + "/")

/** The tab that owns `pathname`, with its group. */
export const findTab = (pathname: string) => {
  for (const group of TAB_GROUPS) {
    const tab = group.tabs.find((t) => isUnder(pathname, t.to))
    if (tab) {
      return { group, tab }
    }
  }
  return undefined
}

/** The group whose tab owns `pathname` (its list or anything under it). */
export const findTabGroup = (pathname: string): TabGroup | undefined =>
  findTab(pathname)?.group

/** The group a nav entry pointing at `to` stands for, when `to` is its first tab. */
export const findTabGroupByLeader = (to: string): TabGroup | undefined =>
  TAB_GROUPS.find((group) => group.tabs[0]?.to === to)

/** Paths that keep a nav entry pointing at `to` highlighted. */
export const getActivePaths = (to: string): string[] =>
  findTabGroupByLeader(to)?.tabs.map((t) => t.to) ?? [to]

/** A tab other than its group's first: it has no nav entry of its own. */
export const isFollowerTab = (to: string): boolean =>
  TAB_GROUPS.some((group) => group.tabs.slice(1).some((t) => t.to === to))

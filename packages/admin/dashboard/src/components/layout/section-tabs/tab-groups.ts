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

export const TAB_GROUPS: TabGroup[] = []

/** The group whose tab owns `pathname` (its list or anything under it). */
export const findTabGroup = (_pathname: string): TabGroup | undefined =>
  undefined

/** The group a nav entry pointing at `to` stands for, when `to` is its first tab. */
export const findTabGroupByLeader = (_to: string): TabGroup | undefined =>
  undefined

/** Paths that keep a nav entry pointing at `to` highlighted. */
export const getActivePaths = (to: string): string[] => [to]

/** A tab other than its group's first: it has no nav entry of its own. */
export const isFollowerTab = (_to: string): boolean => false

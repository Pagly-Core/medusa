import type { INavItem } from "../nav-item"

/**
 * Pagly: the settings sidebar's groups, by what the merchant is doing.
 *
 * Every settings page, core or plugin, is placed here by its route. A page
 * listed in no group renders under Extensions; a tab other than its group's
 * first (see `TAB_GROUPS`) has no entry of its own. To add a page, list its
 * route in the group it belongs to.
 */
export type SettingsNavGroupId = "store" | "sell" | "customers" | "advanced"

export type SettingsNavGroupItem = {
  to: string
  /** i18n key that replaces the page's own label in the sidebar. */
  label?: string
}

export type SettingsNavGroup = {
  id: SettingsNavGroupId
  /** i18n key of the group heading. */
  label: string
  /** Starts folded. */
  collapsed?: boolean
  items: SettingsNavGroupItem[]
}

export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = []

export const EXTENSIONS_SECTION_ID = "extensions"

export type SettingsNavSection = {
  id: SettingsNavGroupId | typeof EXTENSIONS_SECTION_ID
  label: string
  collapsed: boolean
  items: INavItem[]
}

type Translate = (key: string) => string

/** Places the available settings routes into the sidebar's groups, in order. */
export const groupSettingsRoutes = (
  _routes: INavItem[],
  _t: Translate
): SettingsNavSection[] => []

/** The entries whose label, or one of its tabs' labels, matches `query`. */
export const filterSettingsSections = (
  _sections: SettingsNavSection[],
  _query: string,
  _t: Translate
): INavItem[] => []

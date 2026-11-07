import type { INavItem } from "../nav-item"
import { findTabGroupByLeader, isFollowerTab } from "../section-tabs/tab-groups"

/**
 * Pagly: the settings sidebar's groups, by what the merchant is doing.
 *
 * Every settings page, core or plugin, is placed here by its route. A page
 * listed in no group renders under Extensions; a tab other than its group's
 * first (see `TAB_GROUPS`) has no entry of its own, and the first tab's entry
 * takes the group's label. To add a page, list its route in its group.
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

export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    id: "store",
    label: "app.nav.settings.store",
    items: [
      { to: "/settings/store", label: "app.nav.settings.storeGeneral" },
      { to: "/settings/users" },
      { to: "/settings/roles" },
      { to: "/settings/policies" },
      { to: "/settings/domains" },
      { to: "/settings/asistente" },
      { to: "/settings/translations" },
    ],
  },
  {
    id: "sell",
    label: "app.nav.settings.sell",
    items: [
      { to: "/settings/pagos" },
      { to: "/settings/checkout" },
      { to: "/settings/locations", label: "app.nav.settings.shipping" },
      { to: "/settings/regions" },
      { to: "/settings/tax-regions" },
      { to: "/settings/sales-channels" },
    ],
  },
  {
    id: "customers",
    label: "app.nav.settings.customers",
    items: [
      { to: "/settings/customer-accounts" },
      { to: "/settings/notifications" },
      { to: "/settings/return-reasons" },
    ],
  },
  {
    id: "advanced",
    label: "app.nav.settings.advanced",
    collapsed: true,
    items: [
      { to: "/settings/publishable-api-keys" },
      { to: "/settings/workflows" },
      { to: "/settings/search" },
      { to: "/settings/property-labels" },
    ],
  },
]

export const EXTENSIONS_SECTION_ID = "extensions"

export type SettingsNavSection = {
  id: SettingsNavGroupId | typeof EXTENSIONS_SECTION_ID
  label: string
  collapsed: boolean
  items: INavItem[]
}

type Translate = (key: string) => string

const LISTED = new Set(
  SETTINGS_NAV_GROUPS.flatMap((group) => group.items.map((item) => item.to))
)

/** The sidebar label of a listed page: its override, else its group's, else its own. */
const labelFor = (
  item: SettingsNavGroupItem,
  t: Translate
): Partial<Pick<INavItem, "label" | "translationNs">> => {
  const key = item.label ?? findTabGroupByLeader(item.to)?.label
  // A plugin label is already translated in its own namespace; ours replaces it.
  return key ? { label: t(key), translationNs: undefined } : {}
}

/** Places the available settings routes into the sidebar's groups, in order. */
export const groupSettingsRoutes = (
  routes: INavItem[],
  t: Translate
): SettingsNavSection[] => {
  const byPath = new Map(routes.map((route) => [route.to, route]))

  const sections: SettingsNavSection[] = SETTINGS_NAV_GROUPS.map((group) => ({
    id: group.id,
    label: t(group.label),
    collapsed: !!group.collapsed,
    items: group.items.flatMap((item) => {
      const route = byPath.get(item.to)
      return route ? [{ ...route, ...labelFor(item, t) }] : []
    }),
  }))

  sections.push({
    id: EXTENSIONS_SECTION_ID,
    label: t("app.nav.common.extensions"),
    collapsed: false,
    items: routes.filter(
      (route) => !LISTED.has(route.to) && !isFollowerTab(route.to)
    ),
  })

  return sections.filter((section) => section.items.length > 0)
}

/** Lower case, no accents: "Envíos" and "envios" match. */
const fold = (text: string) =>
  text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

/** The labels an entry is found by: its own and its tabs'. */
const searchLabels = (item: INavItem, t: Translate) => [
  item.translationNs ? t(item.label) : item.label,
  ...(findTabGroupByLeader(item.to)?.tabs.map((tab) => t(tab.label)) ?? []),
]

/** The entries whose label, or one of its tabs' labels, matches `query`. */
export const filterSettingsSections = (
  sections: SettingsNavSection[],
  query: string,
  t: Translate
): INavItem[] => {
  const needle = fold(query.trim())
  if (!needle) {
    return []
  }
  return sections
    .flatMap((section) => section.items)
    .filter((item) =>
      searchLabels(item, t).some((label) => fold(label).includes(needle))
    )
}

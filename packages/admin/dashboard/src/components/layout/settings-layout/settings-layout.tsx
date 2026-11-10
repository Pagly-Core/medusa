import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { ArrowUturnLeft } from "@medusajs/icons"
import { clx, Divider, Input, Text } from "@medusajs/ui"
import { ReactNode, useEffect, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useLocation } from "react-router-dom"

import { useSearchIndexes } from "../../../hooks/api/search-indexes"
import { useFeatureFlag } from "../../../providers/feature-flag-provider"
import { usePermissions } from "../../../providers/permissions-provider"
import { useExtension } from "../../../providers/extension-provider"
import { LayoutComposer } from "../../layout-composer"
import { CUSTOMIZE_IDS } from "../../layout-composer/constants"
import { INavItem, NavItem } from "../nav-item"
import { Shell } from "../shell"
import { UserMenu } from "../user-menu"
import {
  filterSettingsSections,
  groupSettingsRoutes,
  SETTINGS_SIDEBAR_SECTION_IDS,
  SettingsNavSection,
} from "./settings-nav-groups"

export const SettingsLayout = () => {
  return (
    <Shell>
      <SettingsSidebar />
    </Shell>
  )
}

/**
 * Every core settings page the admin can open. Where each one shows in the
 * sidebar is up to `SETTINGS_NAV_GROUPS`; the profile lives in the user menu.
 */
const useCoreSettingRoutes = (): INavItem[] => {
  const isTranslationsEnabled = useFeatureFlag("translation")
  const isRbacEnabled = useFeatureFlag("rbac")
  const isViewConfigEnabled = useFeatureFlag("view_configurations")
  const { hasPermission } = usePermissions()
  const { enabled: isSearchEnabled } = useSearchIndexes()
  const { t } = useTranslation()

  const canReadRoles = isRbacEnabled && hasPermission("rbac_role:read")
  const canReadPolicies = isRbacEnabled && hasPermission("rbac_policy:read")

  return useMemo(
    () => [
      { label: t("store.domain"), to: "/settings/store" },
      { label: t("users.domain"), to: "/settings/users" },
      ...(canReadRoles
        ? [{ label: t("roles.domain"), to: "/settings/roles" }]
        : []),
      ...(canReadPolicies
        ? [{ label: t("policies.domain"), to: "/settings/policies" }]
        : []),
      { label: t("regions.domain"), to: "/settings/regions" },
      { label: t("taxRegions.domain"), to: "/settings/tax-regions" },
      { label: t("returnReasons.domain"), to: "/settings/return-reasons" },
      { label: t("refundReasons.domain"), to: "/settings/refund-reasons" },
      { label: t("salesChannels.domain"), to: "/settings/sales-channels" },
      { label: t("stockLocations.domain"), to: "/settings/locations" },
      ...(isViewConfigEnabled
        ? [
            {
              label: t("propertyLabels.domain", "Property Labels"),
              to: "/settings/property-labels",
            },
          ]
        : []),
      ...(isTranslationsEnabled
        ? [{ label: t("translations.domain"), to: "/settings/translations" }]
        : []),
      {
        label: t("apiKeyManagement.domain.publishable"),
        to: "/settings/publishable-api-keys",
      },
      {
        label: t("apiKeyManagement.domain.secret"),
        to: "/settings/secret-api-keys",
      },
      { label: t("workflowExecutions.domain"), to: "/settings/workflows" },
      ...(isSearchEnabled
        ? [{ label: t("searchIndexes.domain"), to: "/settings/search" }]
        : []),
    ],
    [
      t,
      isTranslationsEnabled,
      isViewConfigEnabled,
      isSearchEnabled,
      canReadRoles,
      canReadPolicies,
    ]
  )
}

/**
 * Ensure that the `from` prop is not another settings route, to avoid
 * the user getting stuck in a navigation loop.
 */
const getSafeFromValue = (from: string) => {
  if (from.startsWith("/settings")) {
    return "/orders"
  }

  return from
}

const toNavEntries = (items: INavItem[]) =>
  items.map((item) => (
    <LayoutComposer.Entry id={`settings-nav:${item.to}`} key={item.to}>
      <NavItem key={item.to} type="setting" {...item} />
    </LayoutComposer.Entry>
  ))

const sectionEntries = (sections: SettingsNavSection[], id: string) =>
  toNavEntries(sections.find((section) => section.id === id)?.items ?? [])

export const SettingsSidebar = () => {
  const { t } = useTranslation()
  const { getMenu } = useExtension()
  const { pathname } = useLocation()
  const [query, setQuery] = useState("")

  // Opening a result ends the search: the groups come back, current page lit.
  useEffect(() => {
    setQuery("")
  }, [pathname])

  const coreRoutes = useCoreSettingRoutes()
  const extensionRoutes = getMenu("settingsExtensions")

  const sections = useMemo(
    () =>
      groupSettingsRoutes(
        [...coreRoutes, ...extensionRoutes],
        t as (key: string) => string
      ),
    [coreRoutes, extensionRoutes, t]
  )
  const searching = query.trim().length > 0
  const matches = searching
    ? filterSettingsSections(sections, query, t as (key: string) => string)
    : []

  return (
    <aside className="relative flex flex-1 flex-col justify-between overflow-y-auto">
      <div className="bg-ui-bg-subtle sticky top-0 z-[1]">
        <Header />
        <div className="px-3 pb-3">
          <Input
            type="search"
            size="small"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("app.nav.settings.search")}
            aria-label={t("app.nav.settings.search")}
          />
        </div>
        <div className="flex items-center justify-center px-3">
          <Divider variant="dashed" />
        </div>
      </div>
      <div className="flex flex-1 flex-col">
        <div className="flex flex-1 flex-col overflow-y-auto">
          {searching ? (
            <div className="flex flex-col gap-y-0.5 p-3">
              {matches.map((item) => (
                <NavItem key={item.to} type="setting" {...item} />
              ))}
            </div>
          ) : (
            <LayoutComposer
              widgetsZonePrefix="settings.sidebar"
              preferredLayoutId={CORE_LAYOUT_IDS.SETTINGS_SIDEBAR}
              hasOutlet={false}
              disableWidgets
              customizeId={CUSTOMIZE_IDS.SETTINGS_SIDEBAR}
              controlSize="small"
              sections={
                Object.fromEntries(
                  SETTINGS_SIDEBAR_SECTION_IDS.map((id) => [
                    id,
                    sectionEntries(sections, id),
                  ])
                ) as Record<(typeof SETTINGS_SIDEBAR_SECTION_IDS)[number], ReactNode>
              }
            />
          )}
        </div>
        <div className="bg-ui-bg-subtle sticky bottom-0">
          <UserSection />
        </div>
      </div>
    </aside>
  )
}

const Header = () => {
  const [from, setFrom] = useState("/orders")

  const { t } = useTranslation()
  const location = useLocation()

  useEffect(() => {
    if (location.state?.from) {
      setFrom(getSafeFromValue(location.state.from))
    }
  }, [location])

  return (
    <div className="bg-ui-bg-subtle p-3">
      <Link
        to={from}
        replace
        className={clx(
          "bg-ui-bg-subtle transition-fg flex items-center rounded-md outline-none",
          "hover:bg-ui-bg-subtle-hover",
          "focus-visible:shadow-borders-focus"
        )}
      >
        <div className="flex items-center gap-x-2.5 px-2 py-1">
          <div className="flex items-center justify-center">
            <ArrowUturnLeft className="text-ui-fg-subtle" />
          </div>
          <Text leading="compact" weight="plus" size="small">
            {t("app.nav.settings.header")}
          </Text>
        </div>
      </Link>
    </div>
  )
}

const UserSection = () => {
  return (
    <div>
      <div className="px-3">
        <Divider variant="dashed" />
      </div>
      <UserMenu />
    </div>
  )
}

import {
  BuildingStorefront,
  CogSixTooth,
  EllipsisHorizontal,
  MagnifyingGlass,
  OpenRectArrowOut,
  SquaresPlus,
} from "@medusajs/icons"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { Avatar, clx, Divider, DropdownMenu, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { useStore } from "../../../hooks/api/store"
import { LayoutComposer } from "../../layout-composer"
import { PermissionGuard } from "../../common/permission-guard"
import { Skeleton } from "../../common/skeleton"
import { NavItem } from "../../layout/nav-item"
import { Shell } from "../../layout/shell"

import { Link, useLocation } from "react-router-dom"
import { useSignOut } from "../../../hooks/use-sign-out"
import { useExtension } from "../../../providers/extension-provider"
import { useSearch } from "../../../providers/search-provider"
import { UserMenu } from "../user-menu"
import { useDocumentDirection } from "../../../hooks/use-document-direction"
import { CUSTOMIZE_IDS } from "../../layout-composer/constants"
import { useCoreRoutes } from "./core-routes"
import { SALES_CHANNEL_PATHS } from "./sales-channel-paths"

export const MainLayout = () => {
  return (
    <Shell>
      <MainSidebar />
    </Shell>
  )
}

const MainSidebar = () => {
  return (
    <aside className="flex flex-1 flex-col justify-between overflow-y-auto">
      <div className="flex flex-1 flex-col">
        <PermissionGuard resource="store" operation="read">
          <div className="bg-ui-bg-subtle sticky top-0">
            <Header />
            <div className="px-3">
              <Divider variant="dashed" />
            </div>
          </div>
        </PermissionGuard>
        <div className="flex flex-1 flex-col justify-between">
          <div className="flex flex-1 flex-col">
            <SidebarRoutes />
          </div>
          <UtilitySection />
        </div>
        <div className="bg-ui-bg-subtle sticky bottom-0">
          <UserSection />
        </div>
      </div>
    </aside>
  )
}

const Logout = () => {
  const { t } = useTranslation()
  const handleLogout = useSignOut()

  return (
    <DropdownMenu.Item onClick={handleLogout}>
      <div className="flex items-center gap-x-2">
        <OpenRectArrowOut className="text-ui-fg-subtle" />
        <span>{t("app.menus.actions.logout")}</span>
      </div>
    </DropdownMenu.Item>
  )
}

const Header = () => {
  const { t } = useTranslation()
  const { store, isPending, isError, error } = useStore()
  const direction = useDocumentDirection()
  const name = store?.name
  const fallback = store?.name?.slice(0, 1).toUpperCase()

  const isLoaded = !isPending && !!store && !!name && !!fallback

  if (isError) {
    throw error
  }

  return (
    <div className="w-full p-3">
      <DropdownMenu dir={direction}>
        <DropdownMenu.Trigger
          disabled={!isLoaded}
          className={clx(
            "bg-ui-bg-subtle transition-fg grid w-full grid-cols-[24px_1fr_15px] items-center gap-x-3 rounded-md p-0.5 pe-2 outline-none",
            "hover:bg-ui-bg-subtle-hover",
            "data-[state=open]:bg-ui-bg-subtle-hover",
            "focus-visible:shadow-borders-focus"
          )}
        >
          {fallback ? (
            <Avatar variant="squared" size="xsmall" fallback={fallback} />
          ) : (
            <Skeleton className="h-6 w-6 rounded-md" />
          )}
          <div className="block overflow-hidden text-start">
            {name ? (
              <Text
                size="small"
                weight="plus"
                leading="compact"
                className="truncate"
              >
                {store.name}
              </Text>
            ) : (
              <Skeleton className="h-[9px] w-[120px]" />
            )}
          </div>
          <EllipsisHorizontal className="text-ui-fg-muted" />
        </DropdownMenu.Trigger>
        {isLoaded && (
          <DropdownMenu.Content className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-0">
            <div className="flex items-center gap-x-3 px-2 py-1">
              <Avatar variant="squared" size="small" fallback={fallback} />
              <div className="flex flex-col overflow-hidden">
                <Text
                  size="small"
                  weight="plus"
                  leading="compact"
                  className="truncate"
                >
                  {name}
                </Text>
                <Text
                  size="xsmall"
                  leading="compact"
                  className="text-ui-fg-subtle"
                >
                  {t("app.nav.main.store")}
                </Text>
              </div>
            </div>
            <DropdownMenu.Separator />
            <DropdownMenu.Item className="gap-x-2" asChild>
              <Link to="/settings/store">
                <BuildingStorefront className="text-ui-fg-subtle" />
                {t("app.nav.main.storeSettings")}
              </Link>
            </DropdownMenu.Item>
            <DropdownMenu.Separator />
            <Logout />
          </DropdownMenu.Content>
        )}
      </DropdownMenu>
    </div>
  )
}

const Searchbar = () => {
  const { t } = useTranslation()
  const { toggleSearch } = useSearch()

  return (
    <div>
      <button
        onClick={toggleSearch}
        className={clx(
          "bg-ui-bg-subtle text-ui-fg-subtle flex w-full items-center gap-x-2.5 rounded-md px-2 py-1 outline-none",
          "hover:bg-ui-bg-subtle-hover",
          "focus-visible:shadow-borders-focus"
        )}
      >
        <MagnifyingGlass />
        <div className="flex-1 text-start">
          <Text size="small" leading="compact" weight="plus">
            {t("app.search.label")}
          </Text>
        </div>
        <Text size="small" leading="compact" className="text-ui-fg-muted">
          âŒ˜K
        </Text>
      </button>
    </div>
  )
}

// Pagly: the label above the sales channels, styled like the settings sidebar's group labels.
const SalesChannelsHeading = () => {
  const { t } = useTranslation()

  return (
    <div className="text-ui-fg-muted mt-3 flex h-7 items-center px-2">
      <Text size="small" leading="compact">
        {t("app.nav.salesChannels")}
      </Text>
    </div>
  )
}

/**
 * The customizable nav. Every top-level route(core and extensions) is
 * fed to the `LayoutComposer` as its own entry, so each can be reordered/hidden
 * (and its children reordered) independently in edit mode.
 */
export const SidebarRoutes = () => {
  const coreRoutes = useCoreRoutes()

  const { getMenu } = useExtension()

  const menuItems = getMenu("coreExtensions")

  menuItems.forEach((item) => {
    if (item.nested) {
      const route = coreRoutes.find((route) => route.to === item.nested)
      if (route) {
        route.items?.push(item)
      }
    }
  })

  const corePaths = new Set(coreRoutes.map((route) => route.to))
  // Pagly: a plugin page that is also a core route (Online Store) must not render again as an extension.
  const extensionItems = menuItems.filter(
    (item) => !item.nested && !corePaths.has(item.to)
  )
  // Pagly: sales channels leave the flat list and render last, under a heading.
  const salesChannelItems = SALES_CHANNEL_PATHS.flatMap((path) =>
    extensionItems.filter((item) => item.to === path)
  )
  const otherExtensionItems = extensionItems.filter(
    (item) => !SALES_CHANNEL_PATHS.includes(item.to)
  )

  const renderExtension = (item: (typeof extensionItems)[number]) => (
    <LayoutComposer.Entry id={`nav:${item.to}`} key={item.to}>
      <NavItem
        key={item.to}
        to={item.to}
        label={item.label}
        icon={item.icon ? item.icon : <SquaresPlus />}
        items={item.items}
        translationNs={item.translationNs}
        type="extension"
      />
    </LayoutComposer.Entry>
  )

  return (
    <nav className="py-3">
      <div className="px-3">
        <LayoutComposer
          widgetsZonePrefix="sidebar"
          preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
          hasOutlet={false}
          disableWidgets
          customizeId={CUSTOMIZE_IDS.MAIN_SIDEBAR}
          controlSize="small"
          layoutProps={{
            className: "gap-y-1",
          }}
          sections={{
            main: (
              <>
                <LayoutComposer.Entry id="Searchbar">
                  <Searchbar />
                </LayoutComposer.Entry>
                {coreRoutes.map((route) => (
                  <LayoutComposer.Entry id={`nav:${route.to}`} key={route.to}>
                    <NavItem key={route.to} {...route} />
                  </LayoutComposer.Entry>
                ))}
                {otherExtensionItems.map(renderExtension)}
                {salesChannelItems.length > 0 && (
                  <LayoutComposer.Entry id="SalesChannels">
                    <SalesChannelsHeading />
                  </LayoutComposer.Entry>
                )}
                {salesChannelItems.map(renderExtension)}
              </>
            ),
          }}
        />
      </div>
    </nav>
  )
}

const UtilitySection = () => {
  const location = useLocation()
  const { t } = useTranslation()

  return (
    <div className="flex flex-col gap-y-0.5 px-3 py-3">
      <NavItem
        label={t("app.nav.settings.header")}
        to="/settings"
        from={location.pathname}
        icon={<CogSixTooth />}
      />
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

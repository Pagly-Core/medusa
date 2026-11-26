import {
  BuildingStorefront,
  ChevronUpDown,
  CogSixTooth,
  MagnifyingGlass,
  OpenRectArrowOut,
  SquaresPlus,
} from "@medusajs/icons"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import { clx, DropdownMenu, Text } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { useStore } from "../../../hooks/api/store"
import { LayoutComposer } from "../../layout-composer"
import { PaglyLogo } from "../../common/pagly-logo"
import { PermissionGuard } from "../../common/permission-guard"
import { Skeleton } from "../../common/skeleton"
import { NavItem } from "../../layout/nav-item"
import { Shell } from "../../layout/shell"
import { SHELL_FRAME_BG } from "../../layout/shell/frame"
import { SidebarCollapseButton } from "../sidebar-collapse-button"

import { Link, useLocation } from "react-router-dom"
import { useSignOut } from "../../../hooks/use-sign-out"
import { useExtension } from "../../../providers/extension-provider"
import { useSearch } from "../../../providers/search-provider"
import { searchShortcutLabel } from "../../../providers/search-provider/search-shortcut"
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

// Pagly: the sidebar sits on the shell's grey frame with no dashed lines; its
// sticky bands take the frame's colour so the list scrolls under them.
const MainSidebar = () => {
  return (
    <aside className="flex flex-1 flex-col justify-between overflow-y-auto">
      <div className="flex flex-1 flex-col">
        <div
          className={clx(
            "sticky top-0 z-[1] flex items-center justify-end gap-x-0.5 p-2",
            SHELL_FRAME_BG
          )}
        >
          <PermissionGuard resource="store" operation="read">
            <Header />
          </PermissionGuard>
          {/* Outside the guard: everyone can hide the sidebar. */}
          <SidebarCollapseButton />
        </div>
        <div className="flex flex-1 flex-col justify-between">
          <div className="flex flex-1 flex-col">
            <SidebarRoutes />
          </div>
          <UtilitySection />
        </div>
        <div className={clx("sticky bottom-0", SHELL_FRAME_BG)}>
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

  // Pagly: the Pagly logo where the store's initial was, then the store's name.
  return (
    <div className="min-w-0 flex-1">
      <DropdownMenu dir={direction}>
        <DropdownMenu.Trigger
          disabled={!isLoaded}
          className={clx(
            "transition-fg flex h-12 w-full items-center gap-x-2.5 rounded-lg pe-2 ps-1.5 outline-none",
            "hover:bg-ui-bg-subtle-pressed",
            "data-[state=open]:bg-ui-bg-subtle-pressed",
            "focus-visible:shadow-borders-focus"
          )}
        >
          <PaglyLogo />
          <div className="block min-w-0 flex-1 overflow-hidden text-start">
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
          <ChevronUpDown className="text-ui-fg-muted flex-none" />
        </DropdownMenu.Trigger>
        {isLoaded && (
          <DropdownMenu.Content className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[224px]">
            <div className="flex items-center gap-x-3 px-2 py-1">
              <PaglyLogo size="small" />
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

  // Pagly: search reads as a white field on the frame.
  return (
    <div className="pb-2">
      <button
        onClick={toggleSearch}
        className={clx(
          "bg-ui-bg-base border-ui-border-base text-ui-fg-muted transition-fg flex h-8 w-full items-center gap-x-2 rounded-lg border pe-2 ps-[5px] outline-none",
          "hover:border-ui-border-strong",
          "focus-visible:shadow-borders-focus"
        )}
      >
        <div className="flex size-6 items-center justify-center">
          <MagnifyingGlass />
        </div>
        <div className="flex-1 text-start">
          <Text size="small" leading="compact">
            {t("app.search.label")}
          </Text>
        </div>
        <Text size="small" leading="compact" className="text-ui-fg-muted">
          {searchShortcutLabel(navigator.platform)}
        </Text>
      </button>
    </div>
  )
}

// Pagly: the label above the sales channels, styled like the settings sidebar's group labels.
const SalesChannelsHeading = () => {
  const { t } = useTranslation()

  return (
    <div className="text-ui-fg-muted mt-4 flex h-7 items-center px-2">
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
    <nav className="pb-3 pt-1">
      <div className="px-2">
        <LayoutComposer
          widgetsZonePrefix="sidebar"
          preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_COLUMN}
          hasOutlet={false}
          disableWidgets
          customizeId={CUSTOMIZE_IDS.MAIN_SIDEBAR}
          controlSize="small"
          layoutProps={{
            className: "gap-y-0.5",
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
    <div className="flex flex-col gap-y-0.5 p-2">
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
  return <UserMenu />
}

import { SidebarLeft, TriangleRightMini, XMark } from "@medusajs/icons"
import { IconButton, clx } from "@medusajs/ui"
import { AnimatePresence } from "motion/react"
import { Dialog as RadixDialog } from "radix-ui"
import {
  ComponentType,
  PropsWithChildren,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import {
  Link,
  Outlet,
  UIMatch,
  useMatches,
  useNavigation,
} from "react-router-dom"

import { DocumentTitle } from "../../../hooks/use-document-title"
import { useSidebar } from "../../../providers/sidebar-provider"
import { ProgressBar } from "../../common/progress-bar"
import {
  LayoutCustomizerHostProvider,
  LayoutCustomizerSlot,
} from "../../../providers/customizer-host-provider/customizer-host-provider"
import { Notifications } from "../notifications"
import { CustomizerMenu, LayoutComposer } from "../../layout-composer"
import {
  CUSTOMIZE_IDS,
  LAYOUT_CONTROLS_LOCATION,
} from "../../layout-composer/constants"
import { CORE_LAYOUT_IDS } from "@medusajs/admin-shared"
import {
  SIDEBAR_COLLAPSE_ATTRIBUTE,
  SidebarPlacementProvider,
} from "../sidebar-collapse-button"
import { SHELL_FRAME_BG } from "./frame"

/** Pagly: marks the desktop sidebar's container, for the focus handoff below. */
const DESKTOP_SIDEBAR_ATTRIBUTE = "data-desktop-sidebar"

/**
 * Pagly: whether focus is on nothing, on something no longer in the page, or
 * inside `hidden` (a container that was just hidden). The buttons that hide
 * and show the sidebar each disappear as they act, so focus moves on from them
 * only then, and never away from anything else the merchant is on.
 */
const isFocusLost = (hidden?: Element | null) => {
  const active = document.activeElement
  return (
    !active ||
    active === document.body ||
    !active.isConnected ||
    !!hidden?.contains(active)
  )
}

/**
 * Pagly: the global a plugin sets to a component that wraps every signed-in
 * page, which is how the Pagly assistant is there wherever the merchant goes.
 * Kept as a global so core takes no dependency on the plugin.
 */
const SHELL_ROOT_KEY = "__paglyAssistantRoot"

/**
 * Pagly: the plugin's wrapper when one is registered, and nothing otherwise.
 */
const PluginRoot = ({ children }: PropsWithChildren) => {
  const Root = (globalThis as Record<string, unknown>)[SHELL_ROOT_KEY] as
    | ComponentType<PropsWithChildren>
    | undefined

  return Root ? <Root>{children}</Root> : <>{children}</>
}

export const Shell = ({ children }: PropsWithChildren) => {
  const navigation = useNavigation()
  const { desktop } = useSidebar()

  const loading = navigation.state === "loading"

  return (
    <>
      <DocumentTitle />
      <LayoutCustomizerHostProvider>
        {/* Pagly: isolate, so nothing in the shell with a z-index paints over a portaled drawer or modal overlay. */}
        {/* Pagly: the sidebar sits on a grey frame and the page on a sheet inset from the window. */}
        <div
          className={clx(
            "relative isolate flex h-screen flex-col items-start overflow-hidden lg:flex-row",
            SHELL_FRAME_BG
          )}
        >
          <NavigationBar loading={loading} />
          <div>
            <MobileSidebarContainer>{children}</MobileSidebarContainer>
            <DesktopSidebarContainer>{children}</DesktopSidebarContainer>
          </div>
          <div
            className={clx(
              "bg-ui-bg-subtle flex h-screen w-full min-w-0 flex-1 flex-col overflow-auto",
              "lg:border-ui-border-base lg:my-2 lg:me-2 lg:h-[calc(100vh-1rem)] lg:rounded-xl lg:border",
              { "lg:ms-2": !desktop }
            )}
          >
            <Topbar />
            <main
              className={clx(
                "flex h-full w-full flex-col items-center overflow-y-auto transition-opacity delay-200 duration-200",
                {
                  "opacity-25": loading,
                }
              )}
            >
              <Gutter>
                {/* Pagly: the page, inside the plugin's root if it registered one. */}
                <PluginRoot>
                  <Outlet />
                </PluginRoot>
              </Gutter>
            </main>
          </div>
        </div>
      </LayoutCustomizerHostProvider>
    </>
  )
}

const NavigationBar = ({ loading }: { loading: boolean }) => {
  const [showBar, setShowBar] = useState(false)

  /**
   * If the loading state is true, we want to show the bar after a short delay.
   * The delay is used to prevent the bar from flashing on quick navigations.
   */
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>

    if (loading) {
      timeout = setTimeout(() => {
        setShowBar(true)
      }, 200)
    } else {
      setShowBar(false)
    }

    return () => {
      clearTimeout(timeout)
    }
  }, [loading])

  return (
    <div className="fixed inset-x-0 top-0 z-50 h-1">
      <AnimatePresence>{showBar ? <ProgressBar /> : null}</AnimatePresence>
    </div>
  )
}

const Gutter = ({ children }: PropsWithChildren) => {
  return (
    <div className="flex w-full max-w-[1600px] flex-col gap-y-2 p-3">
      {children}
    </div>
  )
}

const Breadcrumbs = () => {
  const matches = useMatches() as unknown as UIMatch<
    unknown,
    {
      breadcrumb?: (match?: UIMatch) => string | ReactNode
    }
  >[]

  const crumbs = matches
    .filter((match) => match.handle?.breadcrumb)
    .map((match) => {
      const handle = match.handle

      let label: string | ReactNode | undefined = undefined

      try {
        label = handle.breadcrumb?.(match)
      } catch (error) {
        // noop
      }

      if (!label) {
        return null
      }

      return {
        label: label,
        path: match.pathname,
      }
    })
    .filter(Boolean) as { label: string | ReactNode; path: string }[]

  return (
    <ol
      className={clx(
        "text-ui-fg-muted txt-compact-small-plus flex select-none items-center"
      )}
    >
      {crumbs.map((crumb, index) => {
        const isLast = index === crumbs.length - 1
        const isSingle = crumbs.length === 1

        return (
          <li key={index} className={clx("flex items-center")}>
            {!isLast ? (
              <Link
                className="transition-fg hover:text-ui-fg-subtle"
                to={crumb.path}
              >
                {crumb.label}
              </Link>
            ) : (
              <div>
                {!isSingle && <span className="block lg:hidden">...</span>}
                <span
                  key={index}
                  className={clx({
                    "hidden lg:block": !isSingle,
                  })}
                >
                  {crumb.label}
                </span>
              </div>
            )}
            {!isLast && (
              <span className="mx-2">
                <TriangleRightMini className="rtl:rotate-180" />
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

// Pagly: the desktop sidebar hides itself from its own header, so the top bar
// offers the desktop button only while it is hidden, and takes the focus the
// sidebar's button had. The buttons go straight into the top bar's cell: an
// empty wrapper is still a flex item, and its gap pushed the breadcrumbs over.
const ToggleSidebar = () => {
  const { t } = useTranslation()
  const { desktop, toggle } = useSidebar()
  const showButton = useRef<HTMLButtonElement>(null)
  const wasShown = useRef(desktop)

  useEffect(() => {
    if (wasShown.current && !desktop) {
      const sidebar = document.querySelector(`[${DESKTOP_SIDEBAR_ATTRIBUTE}]`)
      if (isFocusLost(sidebar)) {
        showButton.current?.focus()
      }
    }
    wasShown.current = desktop
  }, [desktop])

  return (
    <>
      {!desktop && (
        <IconButton
          ref={showButton}
          className="hidden lg:flex"
          variant="transparent"
          onClick={() => toggle("desktop")}
          size="small"
          aria-label={t("app.nav.sidebar.show")}
        >
          <SidebarLeft className="text-ui-fg-muted rtl:rotate-180" />
        </IconButton>
      )}
      <IconButton
        className="hidden max-lg:flex"
        variant="transparent"
        onClick={() => toggle("mobile")}
        size="small"
        aria-label={t("app.nav.sidebar.show")}
      >
        <SidebarLeft className="text-ui-fg-muted rtl:rotate-180" />
      </IconButton>
    </>
  )
}

const Topbar = () => {
  return (
    <div className="grid w-full grid-cols-2 border-b p-3">
      <div className="flex items-center gap-x-1.5">
        <ToggleSidebar />
        <Breadcrumbs />
      </div>
      <div className="flex items-center justify-end gap-x-3">
        {/* Single trigger for every host; while editing, the active composer's
            controls portal into the adjacent slot in its place. */}
        <CustomizerMenu />
        <LayoutCustomizerSlot location={LAYOUT_CONTROLS_LOCATION} />
        <LayoutComposer
          widgetsZonePrefix="topbar"
          preferredLayoutId={CORE_LAYOUT_IDS.SINGLE_ROW}
          sections={{
            main: (
              <LayoutComposer.Entry id="Notifications">
                <Notifications />
              </LayoutComposer.Entry>
            ),
          }}
          hasOutlet={false}
          customizeId={CUSTOMIZE_IDS.TOPBAR}
          controlSize="xsmall"
        />
      </div>
    </div>
  )
}

const DesktopSidebarContainer = ({ children }: PropsWithChildren) => {
  const { desktop } = useSidebar()
  const container = useRef<HTMLDivElement>(null)
  const wasShown = useRef(desktop)

  // Pagly: shown again from the top bar, whose button then goes away, the
  // sidebar's own hide button takes the focus.
  useEffect(() => {
    if (!wasShown.current && desktop && isFocusLost()) {
      container.current
        ?.querySelector<HTMLElement>(`[${SIDEBAR_COLLAPSE_ATTRIBUTE}]`)
        ?.focus()
    }
    wasShown.current = desktop
  }, [desktop])

  return (
    <div
      ref={container}
      {...{ [DESKTOP_SIDEBAR_ATTRIBUTE]: "" }}
      // Pagly: 240px on the frame, with no rule beside it.
      className={clx("hidden h-screen w-[240px]", {
        "lg:flex": desktop,
      })}
    >
      {children}
    </div>
  )
}

const MobileSidebarContainer = ({ children }: PropsWithChildren) => {
  const { t } = useTranslation()
  const { mobile, toggle } = useSidebar()

  return (
    <RadixDialog.Root open={mobile} onOpenChange={() => toggle("mobile")}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay
          className={clx(
            "bg-ui-bg-overlay fixed inset-0",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          )}
        />
        <RadixDialog.Content
          className={clx(
            // Pagly: the frame's grey, as on desktop, so the sidebar's sticky bands match.
            SHELL_FRAME_BG,
            "shadow-elevation-modal fixed inset-y-2 start-2 flex w-full max-w-[304px] flex-col overflow-hidden rounded-lg border-r",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-start-1/2 data-[state=open]:slide-in-from-start-1/2 duration-200"
          )}
        >
          <div className="p-3">
            <RadixDialog.Close asChild>
              <IconButton
                size="small"
                variant="transparent"
                className="text-ui-fg-subtle"
              >
                <XMark />
              </IconButton>
            </RadixDialog.Close>
            <RadixDialog.Title className="sr-only">
              {t("app.nav.accessibility.title")}
            </RadixDialog.Title>
            <RadixDialog.Description className="sr-only">
              {t("app.nav.accessibility.description")}
            </RadixDialog.Description>
          </div>
          {/* Pagly: the sheet closes with its own button, not the desktop hide button. */}
          <SidebarPlacementProvider value="mobile">
            {children}
          </SidebarPlacementProvider>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  )
}

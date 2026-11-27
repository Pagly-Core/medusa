import { SidebarLeft } from "@medusajs/icons"
import { IconButton } from "@medusajs/ui"
import { createContext, useContext } from "react"
import { useTranslation } from "react-i18next"

import { useSidebar } from "../../../providers/sidebar-provider"

/**
 * Pagly: marks the button, so the shell can hand focus back to it when the
 * top bar's button shows the sidebar again.
 */
export const SIDEBAR_COLLAPSE_ATTRIBUTE = "data-sidebar-collapse"

/**
 * Pagly: where a sidebar is rendered. The phone's sheet closes with its own
 * button, so the hide button stays out of it: in a window widened while the
 * sheet is open it would hide the desktop sidebar behind the sheet instead.
 */
const SidebarPlacementContext = createContext<"desktop" | "mobile">("desktop")
export const SidebarPlacementProvider = SidebarPlacementContext.Provider

/**
 * Pagly: hides the desktop sidebar from inside it. The top bar shows the
 * button that brings it back only while it is hidden. On a phone the sidebar
 * is a sheet with its own close button, so this one is desktop only.
 */
export const SidebarCollapseButton = () => {
  const { t } = useTranslation()
  const { toggle } = useSidebar()
  const placement = useContext(SidebarPlacementContext)

  if (placement === "mobile") {
    return null
  }

  return (
    <IconButton
      size="small"
      variant="transparent"
      className="text-ui-fg-muted hidden flex-none lg:flex"
      aria-label={t("app.nav.sidebar.hide")}
      onClick={() => toggle("desktop")}
      {...{ [SIDEBAR_COLLAPSE_ATTRIBUTE]: "" }}
    >
      <SidebarLeft className="rtl:rotate-180" />
    </IconButton>
  )
}

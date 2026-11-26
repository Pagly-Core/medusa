import { SidebarLeft } from "@medusajs/icons"
import { IconButton } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { useSidebar } from "../../../providers/sidebar-provider"

/**
 * Pagly: hides the desktop sidebar from inside it. The top bar shows the
 * button that brings it back only while it is hidden. On a phone the sidebar
 * is a sheet with its own close button, so this one is desktop only.
 */
export const SidebarCollapseButton = () => {
  const { t } = useTranslation()
  const { toggle } = useSidebar()

  return (
    <IconButton
      size="small"
      variant="transparent"
      className="text-ui-fg-muted hidden flex-none lg:flex"
      aria-label={t("app.nav.sidebar.hide")}
      onClick={() => toggle("desktop")}
    >
      <SidebarLeft className="rtl:rotate-180" />
    </IconButton>
  )
}

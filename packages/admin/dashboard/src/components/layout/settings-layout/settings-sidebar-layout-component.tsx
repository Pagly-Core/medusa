import { MinusMini, PlusMini } from "@medusajs/icons"
import { clx, Divider, IconButton, Text } from "@medusajs/ui"
import { Collapsible as RadixCollapsible } from "radix-ui"
import { Fragment, ReactNode, useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import { useLocation } from "react-router-dom"

import { LayoutComponentProps } from "../../layout-composer/types"
import { getActivePaths, isUnder } from "../section-tabs/tab-groups"
import {
  EXTENSIONS_SECTION_ID,
  SETTINGS_NAV_GROUPS,
} from "./settings-nav-groups"

function hasContent(node: ReactNode): boolean {
  return Array.isArray(node) ? node.length > 0 : Boolean(node)
}

const CollapsibleGroup = ({
  label,
  defaultOpen,
  forceOpen,
  children,
}: {
  label: string
  defaultOpen: boolean
  /** Opens the group, e.g. when one of its pages becomes the current one. */
  forceOpen: boolean
  children: ReactNode
}) => {
  const [open, setOpen] = useState(defaultOpen || forceOpen)

  useEffect(() => {
    if (forceOpen) {
      setOpen(true)
    }
  }, [forceOpen])

  const Icon = open ? MinusMini : PlusMini

  return (
    <RadixCollapsible.Root open={open} onOpenChange={setOpen} className="py-3">
      <div className="px-3">
        <div className="text-ui-fg-muted flex h-7 items-center justify-between px-2">
          <Text size="small" leading="compact">
            {label}
          </Text>
          <RadixCollapsible.Trigger asChild>
            <IconButton
              size="2xsmall"
              variant="transparent"
              className="static"
              aria-label={label}
            >
              <Icon className="text-ui-fg-muted" />
            </IconButton>
          </RadixCollapsible.Trigger>
        </div>
      </div>
      <RadixCollapsible.Content>
        <div className="flex flex-col gap-y-0.5 px-3 pt-0.5">{children}</div>
      </RadixCollapsible.Content>
    </RadixCollapsible.Root>
  )
}

const GroupDivider = () => (
  <div className="flex items-center justify-center px-3">
    <Divider variant="dashed" />
  </div>
)

/**
 * Pagly: the settings sidebar's groups, in `SETTINGS_NAV_GROUPS` order, then
 * Extensions. A folded group opens by itself while one of its pages is open.
 */
export const SettingsSidebarLayoutComponent = ({
  sections,
  className,
}: LayoutComponentProps) => {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const groups = [
    ...SETTINGS_NAV_GROUPS.map((group) => ({
      id: group.id as string,
      label: t(group.label as any),
      collapsed: !!group.collapsed,
      holdsCurrentPage: group.items.some((item) =>
        getActivePaths(item.to).some((to) => isUnder(pathname, to))
      ),
    })),
    {
      id: EXTENSIONS_SECTION_ID,
      label: t("app.nav.common.extensions"),
      collapsed: false,
      holdsCurrentPage: false,
    },
  ].filter((group) => hasContent(sections[group.id]))

  return (
    <div className={clx("flex flex-1 flex-col", className)}>
      {groups.map((group, index) => (
        <Fragment key={group.id}>
          {index > 0 && <GroupDivider />}
          <CollapsibleGroup
            label={group.label}
            defaultOpen={!group.collapsed}
            forceOpen={group.holdsCurrentPage}
          >
            {sections[group.id]}
          </CollapsibleGroup>
        </Fragment>
      ))}
    </div>
  )
}

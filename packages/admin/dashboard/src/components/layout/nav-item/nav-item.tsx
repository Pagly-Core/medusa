import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { DotsSix, Eye, EyeSlash } from "@medusajs/icons"
import { IconButton, Text, clx } from "@medusajs/ui"
import { Collapsible as RadixCollapsible } from "radix-ui"
import {
  ComponentType,
  ReactNode,
  useCallback,
  useEffect,
  useState,
} from "react"
import { useTranslation } from "react-i18next"
import { NavLink, To, useLocation } from "react-router-dom"
import { useLayoutEdit } from "../../../hooks/use-layout-edit"
import { getActivePaths } from "../section-tabs/tab-groups"

type ItemType = "core" | "extension" | "setting"

type NestedItemProps = {
  label: string
  to: string
  translationNs?: string
}

export type INavItem = {
  icon?: ReactNode
  label: string
  to: string
  items?: NestedItemProps[]
  type?: ItemType
  from?: string
  nested?: string
  translationNs?: string
}

const BASE_NAV_LINK_CLASSES =
  "text-ui-fg-subtle transition-fg hover:bg-ui-bg-subtle-hover flex items-center gap-x-2 rounded-md py-0.5 pl-0.5 pr-2 outline-none [&>svg]:text-ui-fg-subtle focus-visible:shadow-borders-focus"
const ACTIVE_NAV_LINK_CLASSES =
  "bg-ui-bg-base shadow-elevation-card-rest text-ui-fg-base hover:bg-ui-bg-base"
const NESTED_NAV_LINK_CLASSES = "pl-[34px] pr-2 py-1 w-full text-ui-fg-muted"
const SETTING_NAV_LINK_CLASSES = "pl-2 py-1"

/**
 * Pagly: the global a plugin sets to the quick actions it shows on a nav item
 * while it is hovered, keyed by the item's route. Kept as a global so core
 * takes no dependency on the plugin.
 */
const NAV_ACTIONS_KEY = "__paglyNavActions"

const getNavActions = (to: string) =>
  (
    (globalThis as Record<string, unknown>)[NAV_ACTIONS_KEY] as
      | Record<string, ComponentType>
      | undefined
  )?.[to]

// Prefix match that respects path-segment boundaries, so that a route like
// "/inventory-sources" is not considered a match for "/inventory". This keeps
// nested-route highlighting (e.g. "/inventory/123") while avoiding false
// positives for sibling routes that merely share a string prefix.
const isPathActive = (pathname: string, to: string) => {
  return pathname === to || pathname.startsWith(to + "/")
}

// Pagly: an entry that stands for a tab group (see `TAB_GROUPS`) is active on
// every tab of the group.
const isEntryActive = (pathname: string, to: string) =>
  getActivePaths(to).some((p) => isPathActive(pathname, p))

const getIsOpen = (
  to: string,
  items: NestedItemProps[] | undefined,
  pathname: string
) => {
  return [to, ...(items?.map((i) => i.to) ?? [])].some((p) =>
    isEntryActive(pathname, p)
  )
}

type SubItemLinkProps = {
  item: NestedItemProps
  isSetting: boolean
  navLinkClassNames: (props: {
    to: string
    isActive: boolean
    isNested?: boolean
    isSetting?: boolean
  }) => string
  getLinkTarget: (target: string) => To
}

const SubItemLink = ({
  item,
  isSetting,
  navLinkClassNames,
  getLinkTarget,
}: SubItemLinkProps) => {
  const { t } = useTranslation(item.translationNs as any)
  const itemLabel: string = item.translationNs ? t(item.label) : item.label

  return (
    <div className="w-full">
      <NavLink
        to={getLinkTarget(item.to)}
        end
        className={({ isActive }) => {
          return clx(
            navLinkClassNames({
              to: item.to,
              isActive,
              isSetting,
              isNested: true,
            })
          )
        }}
      >
        <Text size="small" weight="plus" leading="compact">
          {itemLabel}
        </Text>
      </NavLink>
    </div>
  )
}

const NavItemSubItem = (props: SubItemLinkProps) => {
  return (
    <li className="flex h-7 items-center">
      <SubItemLink {...props} />
    </li>
  )
}

const SortableSubItem = ({
  id,
  hidden,
  onToggleHidden,
  ...props
}: SubItemLinkProps & {
  id: string
  hidden: boolean
  onToggleHidden: () => void
}) => {
  const { t } = useTranslation()
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={clx(
        "flex h-7 items-center gap-x-1",
        isDragging && "opacity-50"
      )}
    >
      <button
        type="button"
        className="text-ui-fg-muted cursor-grab touch-none rounded p-0.5 focus:outline-none [&>svg]:h-3.5 [&>svg]:w-3.5"
        {...attributes}
        {...listeners}
        aria-label={t("layout.dragToReorder")}
      >
        <DotsSix />
      </button>
      <IconButton
        size="2xsmall"
        variant="transparent"
        onClick={onToggleHidden}
        aria-label={hidden ? t("actions.show") : t("actions.hide")}
        className="h-3.5 w-3.5 p-0.5"
      >
        {hidden ? <EyeSlash /> : <Eye />}
      </IconButton>
      <div className={clx("min-w-0 flex-1", hidden && "opacity-30 grayscale")}>
        <SubItemLink {...props} />
      </div>
    </li>
  )
}

/**
 * Renders a route's nested children, applying the saved order. In layout edit
 * mode they become a self-contained vertical sortable (its own `DndContext`, so
 * it doesn't interfere with the composer's entry-level drag), scoped to this
 * route — child ids embed the parent path, so moves never cross routes.
 */
const NavSubItems = ({
  parentTo,
  items,
  isSetting,
  navLinkClassNames,
  getLinkTarget,
}: {
  parentTo: string
  items: NestedItemProps[]
  isSetting: boolean
  navLinkClassNames: SubItemLinkProps["navLinkClassNames"]
  getLinkTarget: SubItemLinkProps["getLinkTarget"]
}) => {
  const { editMode, orderChildren, setChildrenOrder, isHidden, toggleHidden } =
    useLayoutEdit()
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  )
  const childId = useCallback(
    (to: string) => `nav-child:${parentTo}:${to}`,
    [parentTo]
  )

  const ordered = orderChildren(items, (it) => childId(it.to))
  const shared = { isSetting, navLinkClassNames, getLinkTarget }

  if (!editMode) {
    return (
      <>
        {ordered
          .filter((item) => !isHidden(childId(item.to)))
          .map((item) => (
            <NavItemSubItem key={item.to} item={item} {...shared} />
          ))}
      </>
    )
  }

  const ids = ordered.map((it) => childId(it.to))

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) {
      return
    }
    const oldIndex = ids.indexOf(active.id as string)
    const newIndex = ids.indexOf(over.id as string)
    if (oldIndex < 0 || newIndex < 0) {
      return
    }
    setChildrenOrder(arrayMove(ids, oldIndex, newIndex))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {ordered.map((item) => (
          <SortableSubItem
            key={item.to}
            id={childId(item.to)}
            item={item}
            hidden={isHidden(childId(item.to))}
            onToggleHidden={() => toggleHidden(childId(item.to))}
            {...shared}
          />
        ))}
      </SortableContext>
    </DndContext>
  )
}

export const NavItem = ({
  icon,
  label,
  to,
  items,
  type = "core",
  from,
  translationNs,
}: INavItem) => {
  const { t } = useTranslation(translationNs as any)
  const { pathname, search } = useLocation()
  const [open, setOpen] = useState(getIsOpen(to, items, pathname))
  // While the layout is being edited, force the nested list open so every
  // route's children are visible and reorderable, not just the active route's.
  const { editMode } = useLayoutEdit()

  // Use translation if translationNs is provided, otherwise use label as-is
  const displayLabel: string = translationNs ? t(label) : label

  useEffect(() => {
    setOpen(getIsOpen(to, items, pathname))
  }, [pathname, to, items])

  // Pagly: while one of its nested items is active, the parent is not.
  const isNestedItemActive = !!items?.some((item) =>
    isEntryActive(pathname, item.to)
  )

  const navLinkClassNames = useCallback(
    ({
      to: linkTo,
      isActive,
      isNested = false,
      isSetting = false,
    }: {
      to: string
      isActive: boolean
      isNested?: boolean
      isSetting?: boolean
    }) => {
      // Pagly: a nested item stays active on its own detail routes
      // (e.g. "/content/metaobjects/123" keeps "Metaobjects" active) for
      // extensions too, whose NavLinks match exactly.
      if (["core", "setting"].includes(type) || isNested) {
        isActive = isEntryActive(pathname, linkTo)
      }

      if (linkTo === to && isNestedItemActive) {
        isActive = false
      }

      return clx(BASE_NAV_LINK_CLASSES, {
        [NESTED_NAV_LINK_CLASSES]: isNested,
        [ACTIVE_NAV_LINK_CLASSES]: isActive && !editMode,
        [SETTING_NAV_LINK_CLASSES]: isSetting,
      })
    },
    [type, pathname, editMode, to, isNestedItemActive]
  )

  const getLinkTarget = useCallback(
    (target: string) => {
      if (pathname === target && search) {
        return { pathname: target, search }
      }

      return target
    },
    [pathname, search]
  )

  const isSetting = type === "setting"
  const NavActions = editMode ? undefined : getNavActions(to)

  return (
    <div>
      <div className="group/nav-item relative">
        <div className="w-full">
          <NavLink
            to={getLinkTarget(to)}
            end={items?.some((i) => i.to === pathname)}
            state={
              from
                ? {
                    from,
                  }
                : undefined
            }
            className={({ isActive }) => {
              return clx(navLinkClassNames({ isActive, isSetting, to }), {
                "max-lg:hidden": !!items?.length,
              })
            }}
          >
            {type !== "setting" && (
              <div className="flex size-6 items-center justify-center">
                <Icon icon={icon} type={type} />
              </div>
            )}
            <Text size="small" weight="plus" leading="compact">
              {displayLabel}
            </Text>
          </NavLink>
        </div>
        {/* Pagly: a plugin's quick actions, clickable only while shown. */}
        {NavActions && (
          <div
            className={clx(
              "pointer-events-none absolute inset-y-0 right-1 flex items-center opacity-0 transition-opacity focus-within:pointer-events-auto focus-within:opacity-100 group-hover/nav-item:pointer-events-auto group-hover/nav-item:opacity-100",
              { "max-lg:hidden": !!items?.length }
            )}
          >
            <NavActions />
          </div>
        )}
      </div>
      {items && items.length > 0 && (
        <RadixCollapsible.Root open={editMode || open} onOpenChange={setOpen}>
          <RadixCollapsible.Trigger
            className={clx(
              "text-ui-fg-subtle hover:text-ui-fg-base transition-fg hover:bg-ui-bg-subtle-hover flex w-full items-center gap-x-2 rounded-md py-0.5 pl-0.5 pr-2 outline-none lg:hidden",
              { "pl-2": isSetting }
            )}
          >
            <div className="flex size-6 items-center justify-center">
              <Icon icon={icon} type={type} />
            </div>
            <Text size="small" weight="plus" leading="compact">
              {displayLabel}
            </Text>
          </RadixCollapsible.Trigger>
          <RadixCollapsible.Content>
            <div className="flex flex-col gap-y-0.5 pb-2 pt-0.5">
              <ul className="flex flex-col gap-y-0.5">
                <li className="flex w-full items-center gap-x-1 lg:hidden">
                  <div className="w-full">
                    <NavLink
                      to={getLinkTarget(to)}
                      end
                      className={({ isActive }) => {
                        return clx(
                          navLinkClassNames({
                            to,
                            isActive,
                            isSetting,
                            isNested: true,
                          })
                        )
                      }}
                    >
                      <Text size="small" weight="plus" leading="compact">
                        {displayLabel}
                      </Text>
                    </NavLink>
                  </div>
                </li>
                <NavSubItems
                  parentTo={to}
                  items={items}
                  isSetting={isSetting}
                  navLinkClassNames={navLinkClassNames}
                  getLinkTarget={getLinkTarget}
                />
              </ul>
            </div>
          </RadixCollapsible.Content>
        </RadixCollapsible.Root>
      )}
    </div>
  )
}

const Icon = ({ icon, type }: { icon?: ReactNode; type: ItemType }) => {
  if (!icon) {
    return null
  }

  return type === "extension" ? (
    <div className="flex h-5 w-5 items-center justify-center">
      <div className="h-[15px] w-[15px] overflow-hidden">{icon}</div>
    </div>
  ) : (
    icon
  )
}

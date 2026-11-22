import { PencilSquare } from "@medusajs/icons"
import { Heading, IconButton, Text, clx } from "@medusajs/ui"
import { ReactNode } from "react"
import { Link } from "react-router-dom"

/**
 * Pagly: the product page's card grammar. A card's edit is a pencil in its
 * header, named for screen readers; a row is a label, a value and maybe a
 * control (a switch, a named button).
 */
export const CardHeading = ({
  title,
  editTo,
  editLabel,
  tools,
}: {
  title: string
  editTo?: string
  editLabel?: string
  tools?: ReactNode
}) => (
  <div className="flex items-center justify-between gap-x-3 px-6 py-4">
    <Heading level="h2">{title}</Heading>
    <div className="flex items-center gap-x-1">
      {editTo && (
        <IconButton size="small" variant="transparent" asChild>
          <Link to={editTo} aria-label={editLabel}>
            <PencilSquare />
          </Link>
        </IconButton>
      )}
      {tools}
    </div>
  </div>
)

export const CardRow = ({
  label,
  action,
  top,
  children,
}: {
  label: string
  action?: ReactNode
  top?: boolean
  children: ReactNode
}) => (
  <div
    className={clx(
      "grid grid-cols-[104px_minmax(0,1fr)_auto] gap-x-3 px-6 py-3 md:grid-cols-[112px_minmax(0,1fr)_auto]",
      top ? "items-start" : "items-center"
    )}
  >
    <Text
      size="small"
      leading="compact"
      weight="plus"
      className="text-ui-fg-subtle"
    >
      {label}
    </Text>
    <Text
      size="small"
      leading="compact"
      className="min-w-0 break-words"
      asChild
    >
      <div>{children}</div>
    </Text>
    <div className="flex items-center">{action}</div>
  </div>
)

export const CardNote = ({ children }: { children: ReactNode }) => (
  <Text size="small" className="text-ui-fg-subtle px-6 py-4">
    {children}
  </Text>
)

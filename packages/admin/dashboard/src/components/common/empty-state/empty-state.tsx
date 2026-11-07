// Pagly: the empty state of a list page, shared with @pagly/storefront's admin.
import { Heading, Text } from "@medusajs/ui"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { EMPTY_STATES, type EmptyStateKind } from "./registry"

/**
 * What an empty list page shows: a drawing of the feature in use, a title,
 * one sentence saying what it is, and the page's main action. Search and
 * filters that match nothing keep their short "no results" block instead.
 */
export const EmptyState = ({
  kind,
  title,
  description,
  action,
}: {
  kind: EmptyStateKind
  /** Replaces the kind's title, for a variant of the same page. */
  title?: string
  /** Replaces the kind's description, for a variant of the same page. */
  description?: string
  action?: ReactNode
}) => {
  const { t } = useTranslation()
  const { Illustration } = EMPTY_STATES[kind]

  return (
    <div
      data-empty-state={kind}
      className="flex w-full flex-col items-center justify-center gap-y-4 px-6 py-12 text-center"
    >
      <div className="w-[240px] max-w-full">
        <Illustration />
      </div>
      <div className="flex flex-col items-center gap-y-1">
        <Heading level="h3">
          {title ?? t(`emptyStates.${kind}.title`)}
        </Heading>
        <Text size="small" className="text-ui-fg-subtle max-w-[360px]">
          {description ?? t(`emptyStates.${kind}.description`)}
        </Text>
      </div>
      {action ? (
        <div className="flex items-center gap-x-2">{action}</div>
      ) : null}
    </div>
  )
}

import type { TFunction } from "i18next"
import type { ReactNode } from "react"
import type { UIMatch } from "react-router-dom"

export type CrumbHandle = {
  breadcrumb?: (match?: UIMatch) => string | ReactNode
  label?: string
  translationNs?: string
}

/** A route's breadcrumb. */
export const breadcrumbLabel = (
  _handle: CrumbHandle | undefined,
  _match: UIMatch,
  _t: TFunction
): string | ReactNode | undefined => undefined

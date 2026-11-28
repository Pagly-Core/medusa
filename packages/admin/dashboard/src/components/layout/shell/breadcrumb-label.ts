import type { TFunction } from "i18next"
import type { ReactNode } from "react"
import type { UIMatch } from "react-router-dom"

export type CrumbHandle = {
  breadcrumb?: (match?: UIMatch) => string | ReactNode
  /** An extension route's sidebar label, which the vite plugin copies from its `config`. */
  label?: string
  translationNs?: string
}

/**
 * Pagly: a route's breadcrumb, or else its sidebar label. A plugin's pages
 * define a label for the sidebar but no breadcrumb, which left theirs empty
 * (Pagly-Core/pagly-app#354).
 */
export const breadcrumbLabel = (
  handle: CrumbHandle | undefined,
  match: UIMatch,
  t: TFunction
): string | ReactNode | undefined => {
  if (handle?.breadcrumb) {
    try {
      return handle.breadcrumb(match) || undefined
    } catch {
      return undefined
    }
  }

  if (!handle?.label) {
    return undefined
  }

  return handle.translationNs
    ? String((t as any)(handle.label, { ns: handle.translationNs }))
    : handle.label
}

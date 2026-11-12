import { FetchError } from "@medusajs/js-sdk"
import { useQuery } from "@tanstack/react-query"
import { useCallback } from "react"

import { sdk } from "./client"

/**
 * The storefront the admin was built for. One admin build serves every store
 * on a multi-store host, so store links ask the backend instead
 * (useStorefrontHref); this is only for a backend that cannot say.
 */
export const MEDUSA_STOREFRONT_URL =
  __STOREFRONT_URL__ || "http://localhost:8000"

/** Pagly: @pagly/storefront's GET /admin/storefront. */
type StorefrontAnswer = {
  storefront: {
    /**
     * The storefront the editor frames: for a store that is not published
     * yet, a preview only the merchant can open. Null while pending.
     */
    url: string | null
    /** The address visitors reach the store on. Null while it has none. */
    live_url?: string | null
    status: "ready" | "pending"
  }
}

/**
 * Pagly: the key @pagly/storefront's admin keeps the same answer under, so
 * the online store screens and these links share one request.
 */
const STOREFRONT_QUERY_KEY = ["pagly-storefront"]

/**
 * Pagly: a storefront path such as `/products/blusa` (the storefront adds the
 * country itself) on the store's address. Unlike string concatenation it
 * keeps the address's query, which a private preview needs on every request.
 */
export const storefrontHref = (base: string, path: string): string => {
  const url = new URL(base)
  const target = new URL(path, "https://storefront.invalid")

  url.pathname = target.pathname
  target.searchParams.forEach((value, name) => {
    url.searchParams.set(name, value)
  })

  return url.toString()
}

/**
 * Pagly: the address store links open: the store's public one, else, while
 * it has none, the preview the merchant can open. Nothing while the
 * storefront is still being prepared.
 */
export const storefrontLinkBase = (
  answer: StorefrontAnswer
): string | undefined =>
  answer.storefront.live_url || answer.storefront.url || undefined

const isMissingRoute = (error: unknown) =>
  error instanceof FetchError && error.status === 404

/**
 * Pagly: links into the current store's online store. On a multi-store host
 * every store has its own address, so it comes from the backend at runtime,
 * never from the build. A backend without GET /admin/storefront (no
 * @pagly/storefront) gets the build's storefront. Nothing while the answer
 * is on its way, after it failed, or while the storefront is being prepared:
 * hide the link then rather than open another store.
 */
export const useStorefrontHref = (): ((path: string) => string | undefined) => {
  const { data, error } = useQuery({
    queryKey: STOREFRONT_QUERY_KEY,
    queryFn: () => sdk.client.fetch<StorefrontAnswer>("/admin/storefront"),
    staleTime: Infinity,
  })

  const base = data
    ? storefrontLinkBase(data)
    : isMissingRoute(error)
      ? MEDUSA_STOREFRONT_URL
      : undefined

  return useCallback(
    (path: string) => (base ? storefrontHref(base, path) : undefined),
    [base]
  )
}

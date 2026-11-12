import { useCallback } from "react"

/**
 * The storefront the admin was built for. One admin build serves every store
 * on a multi-store host, so store links take the address @pagly/storefront
 * gives them (useStorefrontHref); this is only for a backend without it.
 */
export const MEDUSA_STOREFRONT_URL =
  __STOREFRONT_URL__ || "http://localhost:8000"

/**
 * Pagly: where @pagly/storefront registers the hook store links use, on
 * globalThis, as it registers its nav actions and provider looks. The hook
 * answers a storefront path with its address on the current store's own
 * storefront, or nothing while the store has none to open.
 */
export const STOREFRONT_HREF_HOOK_KEY = "__paglyUseStorefrontHref"

type UseStorefrontHref = () => (path: string) => string | undefined

/**
 * Pagly: a storefront path such as `/products/blusa` (the storefront adds the
 * country itself) on the store's address. Unlike string concatenation it
 * keeps the address's query, which a private preview needs on every request,
 * and the path's own query and anchor. The same as @pagly/storefront's
 * storefrontPageHref (admin/lib/storefront-href.ts): keep the two alike.
 */
export const storefrontHref = (base: string, path: string): string => {
  const url = new URL(base)
  const page = new URL(path, url)

  url.pathname = page.pathname
  page.searchParams.forEach((value, name) => {
    url.searchParams.set(name, value)
  })
  url.hash = page.hash

  return url.toString()
}

/** Links on the storefront the admin was built for. */
const useBuildStorefrontHref: UseStorefrontHref = () =>
  useCallback((path: string) => storefrontHref(MEDUSA_STOREFRONT_URL, path), [])

/**
 * Pagly: links into the current store's online store: `undefined` while the
 * store has no address to open (hide the link then rather than open another
 * store). The plugin's hook when it registered one, which knows each store's
 * own address; the build's storefront otherwise. The plugin registers it as
 * its admin loads, before the dashboard renders, so every render calls the
 * same hook.
 */
export const useStorefrontHref: UseStorefrontHref = () => {
  const registered = (globalThis as Record<string, unknown>)[
    STOREFRONT_HREF_HOOK_KEY
  ] as UseStorefrontHref | undefined

  return (registered ?? useBuildStorefrontHref)()
}

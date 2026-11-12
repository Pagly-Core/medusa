import { useCallback } from "react"

export const MEDUSA_STOREFRONT_URL =
  __STOREFRONT_URL__ || "http://localhost:8000"

export const STOREFRONT_HREF_HOOK_KEY = "__paglyUseStorefrontHref"

export const storefrontHref = (base: string, path: string): string => {
  const url = new URL(base)
  const target = new URL(path, "https://storefront.invalid")

  url.pathname = target.pathname
  target.searchParams.forEach((value, name) => {
    url.searchParams.set(name, value)
  })

  return url.toString()
}

// Red-phase stub: always the build's storefront.
export const useStorefrontHref = (): ((path: string) => string | undefined) =>
  useCallback((path: string) => storefrontHref(MEDUSA_STOREFRONT_URL, path), [])

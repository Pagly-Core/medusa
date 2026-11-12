export const MEDUSA_STOREFRONT_URL =
  __STOREFRONT_URL__ ?? "http://localhost:8000"

/**
 * Pagly: the online store's address for a storefront path such as
 * `/products/blusa`. The storefront adds the country itself.
 */
export const storefrontUrl = (path: string) =>
  `${MEDUSA_STOREFRONT_URL.replace(/\/$/, "")}${path}`

type StorefrontAnswer = {
  storefront: {
    url: string | null
    live_url?: string | null
    status: "ready" | "pending"
  }
}

export const storefrontHref = (_base: string, _path: string): string => ""

export const storefrontLinkBase = (
  _answer: StorefrontAnswer
): string | undefined => undefined

export const useStorefrontHref =
  (): ((path: string) => string | undefined) => () =>
    undefined

// Pagly: a plugin registers how its providers read (a carrier's name and
// logo) on globalThis.__paglyProviderLooks, as @pagly/storefront registers its
// media picker. See PAGLY-CORE-DIVERGENCE.md.
type ProviderLook = { name?: string; logo?: string | null }

const lookOf = (id: string): ProviderLook | undefined =>
  ((globalThis as Record<string, unknown>).__paglyProviderLooks as Record<string, ProviderLook> | undefined)?.[id]

/** The logo a plugin gives a provider, or null. */
export const providerLogo = (id: string): string | null => lookOf(id)?.logo ?? null

/**
 * Providers only have an ID to identify them. This function formats the ID
 * into a human-readable string.
 *
 * Format example: pp_stripe-blik_dkk
 *
 * @param id - The ID of the provider
 * @returns A formatted string
 */
export const formatProvider = (id: string) => {
  // Pagly: the name a plugin gives its provider wins.
  const given = lookOf(id)?.name
  if (given) {
    return given
  }

  const [_, name, ...rest] = id.split("_")

  if (!name) {
    return id
  }

  const formattedName = name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ")

  if (!rest.length) {
    return formattedName
  }

  // A single short part (eg. a currency code) reads better uppercased, while longer
  // identifiers (eg. a payment account ID like acct_123) are kept as they are.
  const type = rest.length === 1 ? rest[0].toUpperCase() : rest.join("_")

  return `${formattedName} (${type})`
}

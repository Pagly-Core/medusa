// Pagly: the provinces a plugin registers on globalThis.__paglyProvinces
// (Uruguay's departamentos), by lower-case ISO 3166-2 code: zones can cover
// some of a country's, and addresses saved by code read by name. See
// PAGLY-CORE-DIVERGENCE.md.

export type ProvinceOption = { code: string; name: string }

const registry = () =>
  ((globalThis as Record<string, unknown>).__paglyProvinces ?? {}) as Record<
    string,
    ProvinceOption[] | undefined
  >

/** The provinces a plugin registered for a country, none when it registered none. */
export const registeredProvinces = (iso2: string): ProvinceOption[] =>
  registry()[iso2.toLowerCase()] ?? []

/** A province's name, or the value as it is when no plugin registered it. */
export const provinceName = (code: string): string => {
  const key = code.trim().toLowerCase()
  for (const provinces of Object.values(registry())) {
    const found = provinces?.find((one) => one.code === key)
    if (found) {
      return found.name
    }
  }
  return code
}

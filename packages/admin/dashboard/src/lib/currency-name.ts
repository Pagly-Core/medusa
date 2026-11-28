/**
 * Pagly: a currency's name in the admin's language. The currency module's
 * rows are seeded in English ("Uruguayan Peso"), so the lists read them
 * through Intl; a code Intl doesn't know keeps its stored name
 * (Pagly-Core/pagly-app#267).
 */
export const currencyName = (code: string, fallback: string | undefined, language: string): string => {
  try {
    const name = new Intl.DisplayNames([language], { type: "currency", fallback: "none" }).of(code.toUpperCase())
    if (name) {
      return name.charAt(0).toUpperCase() + name.slice(1)
    }
  } catch {
    // An unknown language or code: the stored name.
  }
  return fallback ?? code.toUpperCase()
}

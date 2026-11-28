/** A currency's name in the admin's language. */
export const currencyName = (_code: string, fallback: string | undefined, _language: string): string =>
  fallback ?? ""

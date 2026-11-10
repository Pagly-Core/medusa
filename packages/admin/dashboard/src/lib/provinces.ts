// Pagly: a country's provinces (Uruguay's departamentos) from the dashboard's
// own table (lib/data/country-states), by lower-case ISO 3166-2 code, the way
// checkout saves them: zones can cover some of a country's, and addresses
// saved by code read by name. See PAGLY-CORE-DIVERGENCE.md.
import {
  getCountryProvinceObjectByIso2,
  getProvinceByIso2,
} from "./data/country-states"

export type ProvinceOption = { code: string; name: string }

/** A country's provinces, none when the table lists none for it. */
export const registeredProvinces = (iso2: string): ProvinceOption[] =>
  Object.entries(getCountryProvinceObjectByIso2(iso2)?.options ?? {}).map(
    ([code, name]) => ({ code: code.toLowerCase(), name })
  )

/** A province's name, or the value as it is when it isn't a known code. */
export const provinceName = (code: string): string =>
  getProvinceByIso2(code.trim()) ?? code

// Pagly: a zone can cover some provinces of a country (Uruguay's
// departamentos), which a plugin registers on globalThis.__paglyProvinces by
// lower-case ISO 3166-2 code. See PAGLY-CORE-DIVERGENCE.md.

export type ProvinceOption = { code: string; name: string }

/** A country in a zone's form, with the provinces it covers; none is the whole country. */
export type AreaCountry = { iso_2: string; display_name: string; provinces?: string[] }

type GeoZoneLike = {
  id?: string
  type: string
  country_code: string
  province_code?: string | null
}

/** The provinces a plugin registered for a country, none when it registered none. */
export const registeredProvinces = (iso2: string): ProvinceOption[] => []

/** A province's name, or its code when no plugin registered it. */
export const provinceName = (code: string): string => code

/** The geo zones a zone's form saves. */
export const toGeoZones = (countries: AreaCountry[]) => [] as GeoZoneLike[]

/** A zone's countries for its form, each with the provinces it covers. */
export const fromGeoZones = (
  geoZones: GeoZoneLike[],
  displayName: (iso2: string) => string
): AreaCountry[] => []

/** What a zone covers, one line per country: "Uruguay" or "Uruguay · Maldonado, Rocha". */
export const areaLabels = (
  geoZones: GeoZoneLike[],
  displayName: (iso2: string) => string
): string[] => []

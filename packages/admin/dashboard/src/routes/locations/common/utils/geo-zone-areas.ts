// Pagly: a zone can cover some provinces of a country (Uruguay's
// departamentos), which a plugin registers (lib/provinces). See
// PAGLY-CORE-DIVERGENCE.md.
import { provinceName } from "../../../../lib/provinces"

export {
  provinceName,
  registeredProvinces,
  type ProvinceOption,
} from "../../../../lib/provinces"

/** A country in a zone's form, with the provinces it covers; none is the whole country. */
export type AreaCountry = { iso_2: string; display_name: string; provinces?: string[] }

type GeoZoneLike = {
  id?: string
  type: string
  country_code: string
  province_code?: string | null
}

/** The geo zones a zone's form saves. */
export type AreaGeoZone =
  | { type: "country"; country_code: string }
  | { type: "province"; country_code: string; province_code: string }

export const toGeoZones = (countries: AreaCountry[]): AreaGeoZone[] =>
  countries.flatMap((country): AreaGeoZone[] =>
    country.provinces?.length
      ? country.provinces.map((province_code) => ({
          type: "province" as const,
          country_code: country.iso_2,
          province_code,
        }))
      : [{ type: "country" as const, country_code: country.iso_2 }]
  )

/** A zone's countries for its form, each with the provinces it covers. */
export const fromGeoZones = (
  geoZones: GeoZoneLike[],
  displayName: (iso2: string) => string
): AreaCountry[] => {
  const countries = new Map<string, AreaCountry>()
  for (const zone of geoZones) {
    const country = countries.get(zone.country_code) ?? {
      iso_2: zone.country_code,
      display_name: displayName(zone.country_code),
      provinces: [],
    }
    if (zone.type === "province" && zone.province_code) {
      country.provinces!.push(zone.province_code)
    }
    countries.set(zone.country_code, country)
  }
  // A country the zone also covers whole is covered whole.
  for (const zone of geoZones) {
    if (zone.type === "country") {
      countries.get(zone.country_code)!.provinces = []
    }
  }
  return [...countries.values()]
}

/** Another zone of the same fulfillment set. */
export type OtherZone = { id?: string; name: string; geo_zones?: GeoZoneLike[] | null }

/** Of a country, what the set's other zones hold: all of it, or provinces by code. */
export type TakenAreas = { whole: string | null; provinces: Record<string, string> }

/** An overlap with another zone: its name and the areas (province codes, or the country) both would cover. */
export type AreaConflict = { iso_2: string; zone: string; areas: string[] }

export const takenIn = (_otherZones: OtherZone[], _iso2: string): TakenAreas => ({ whole: null, provinces: {} })

export const areaConflicts = (_countries: AreaCountry[], _otherZones: OtherZone[]): AreaConflict[] => []

/** What a zone covers, one line per country: "Uruguay" or "Uruguay · Maldonado, Rocha". */
export const areaLabels = (
  geoZones: GeoZoneLike[],
  displayName: (iso2: string) => string
): string[] =>
  fromGeoZones(geoZones, displayName).map((country) =>
    country.provinces?.length
      ? `${country.display_name} · ${country.provinces.map(provinceName).join(", ")}`
      : country.display_name
  )

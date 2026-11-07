// Pagly: a zone can cover some provinces of a country (Uruguay's
// departamentos), which a plugin registers (lib/provinces). See
// PAGLY-CORE-DIVERGENCE.md.
import { provinceName, registeredProvinces } from "../../../../lib/provinces"

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

export const takenIn = (otherZones: OtherZone[], iso2: string): TakenAreas => {
  const country = iso2.toLowerCase()
  const taken: TakenAreas = { whole: null, provinces: {} }

  for (const zone of otherZones) {
    for (const geo of zone.geo_zones ?? []) {
      if (geo.country_code?.toLowerCase() !== country) continue
      if (geo.type === "country") {
        taken.whole = taken.whole ?? zone.name
      } else if (geo.type === "province" && geo.province_code) {
        taken.provinces[geo.province_code.toLowerCase()] = zone.name
      }
    }
  }

  return taken
}

/**
 * Where a zone's areas would overlap the set's other zones: a province one
 * of them holds, the whole country while one holds part of it, or any part
 * of a country one holds whole. One entry per country and zone.
 */
export const areaConflicts = (countries: AreaCountry[], otherZones: OtherZone[]): AreaConflict[] => {
  const conflicts: AreaConflict[] = []

  for (const country of countries) {
    const taken = takenIn(otherZones, country.iso_2)
    if (taken.whole) {
      conflicts.push({ iso_2: country.iso_2, zone: taken.whole, areas: [country.iso_2] })
      continue
    }

    const wanted = country.provinces?.length ? country.provinces : Object.keys(taken.provinces)
    const byZone = new Map<string, string[]>()
    for (const province of wanted) {
      const zone = taken.provinces[province.toLowerCase()]
      if (zone) byZone.set(zone, [...(byZone.get(zone) ?? []), province])
    }
    for (const [zone, areas] of byZone) {
      conflicts.push({ iso_2: country.iso_2, zone, areas })
    }
  }

  return conflicts
}

/**
 * What a zone covers, one line per country: "Uruguay", "Uruguay · Maldonado,
 * Rocha", or with `someOfAll`, "Uruguay · 16 of 19" for many provinces.
 */
export const areaLabels = (
  geoZones: GeoZoneLike[],
  displayName: (iso2: string) => string,
  someOfAll?: (count: number, total: number) => string
): string[] =>
  fromGeoZones(geoZones, displayName).map((country) => {
    const chip = areaChip(country)
    if (chip.kind === "whole") return country.display_name
    if (chip.kind === "count" && someOfAll) return `${country.display_name} · ${someOfAll(chip.count, chip.total)}`
    return `${country.display_name} · ${country.provinces!.map(provinceName).join(", ")}`
  })

/**
 * The countries a zone can cover, as a plugin registers them on
 * globalThis.__paglyZoneCountries (the store's country), or null to offer
 * every country.
 */
export const zoneCountries = (): Promise<string[]> | null => {
  const registered = (globalThis as Record<string, unknown>).__paglyZoneCountries
  return typeof registered === "function"
    ? Promise.resolve((registered as () => Promise<string[]>)()).then((codes) =>
        codes.map((code) => code.toLowerCase())
      )
    : null
}

type PickedCountry = { iso_2: string; display_name: string }

/** The provinces of a country no other zone of the set holds. */
const freeProvinces = (iso2: string, taken: TakenAreas): string[] =>
  taken.whole ? [] : registeredProvinces(iso2).flatMap((province) => (taken.provinces[province.code] ? [] : [province.code]))

const sameIso = (iso2: string) => (area: AreaCountry) => area.iso_2.toLowerCase() === iso2.toLowerCase()

/** Ticked when the zone covers the country whole, or every province no other zone holds. */
export const countryCheck = (areas: AreaCountry[], iso2: string, taken: TakenAreas): boolean | "indeterminate" => {
  const area = areas.find(sameIso(iso2))
  if (!area) return false
  if (!area.provinces?.length) return true
  const free = freeProvinces(iso2, taken)
  return free.length > 0 && free.every((code) => area.provinces!.includes(code)) ? true : "indeterminate"
}

/** Sets a country's provinces: none drops it, all of them (none held elsewhere) covers it whole. */
const withProvinces = (areas: AreaCountry[], country: PickedCountry, provinces: string[], taken: TakenAreas) => {
  const all = registeredProvinces(country.iso_2).map((province) => province.code)
  const whole = !taken.whole && !Object.keys(taken.provinces).length && all.length > 0 && all.every((code) => provinces.includes(code))
  const next: AreaCountry | null = provinces.length
    ? { ...country, provinces: whole ? [] : all.filter((code) => provinces.includes(code)) }
    : null
  const index = areas.findIndex(sameIso(country.iso_2))
  if (index < 0) return next ? [...areas, next] : areas
  return next ? areas.map((area, i) => (i === index ? next : area)) : areas.filter((_, i) => i !== index)
}

/** Ticks or unticks a country: all of it that is free, or none of it. */
export const toggleCountry = (areas: AreaCountry[], country: PickedCountry, taken: TakenAreas): AreaCountry[] => {
  if (countryCheck(areas, country.iso_2, taken) === true) {
    return areas.filter((area) => !sameIso(country.iso_2)(area))
  }
  if (taken.whole) return areas
  if (!Object.keys(taken.provinces).length) {
    return withProvinces(areas, country, registeredProvinces(country.iso_2).map((p) => p.code), taken).map((area) =>
      sameIso(country.iso_2)(area) ? { ...area, provinces: [] } : area
    )
  }
  return withProvinces(areas, country, freeProvinces(country.iso_2, taken), taken)
}

/** Ticks or unticks one province of a country; one another zone holds stays out. */
export const toggleProvince = (
  areas: AreaCountry[],
  country: PickedCountry,
  code: string,
  taken: TakenAreas
): AreaCountry[] => {
  if (taken.whole || taken.provinces[code]) return areas
  const area = areas.find(sameIso(country.iso_2))
  const current = !area ? [] : area.provinces?.length ? area.provinces : registeredProvinces(country.iso_2).map((p) => p.code)
  const next = current.includes(code) ? current.filter((one) => one !== code) : [...current, code]
  return withProvinces(areas, country, next, taken)
}

/** How a country reads on the zone's form: whole, a few provinces by name, or how many of all. */
export type AreaChip = { kind: "whole" } | { kind: "names"; names: string[] } | { kind: "count"; count: number; total: number }

const NAMED_PROVINCES = 3

export const areaChip = (country: AreaCountry): AreaChip => {
  const provinces = country.provinces ?? []
  if (!provinces.length) return { kind: "whole" }
  if (provinces.length <= NAMED_PROVINCES) return { kind: "names", names: provinces.map(provinceName) }
  return { kind: "count", count: provinces.length, total: registeredProvinces(country.iso_2).length }
}

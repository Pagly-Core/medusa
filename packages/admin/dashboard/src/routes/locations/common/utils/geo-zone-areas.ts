// Pagly: a zone can cover some provinces of a country (Uruguay's
// departamentos), listed in lib/provinces. See PAGLY-CORE-DIVERGENCE.md.
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
  city?: string | null
  postal_expression?: Record<string, unknown> | null
}

/** The geo zones a zone's form saves. */
export type AreaGeoZone =
  | { type: "country"; country_code: string }
  | { type: "province"; country_code: string; province_code: string }

/** Codes match whatever their case: the API stores them as sent. */
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

const sameIso = (iso2: string) => (area: AreaCountry) => same(area.iso_2, iso2)

/** Each code once, the first spelling kept. */
const distinct = (codes: string[]) =>
  codes.filter((code, index) => codes.findIndex((one) => same(one, code)) === index)

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

/**
 * A zone's countries for its form, each with the provinces it covers. City
 * and zip areas aren't the form's (see keptGeoZones).
 */
export const fromGeoZones = (
  geoZones: GeoZoneLike[],
  displayName: (iso2: string) => string
): AreaCountry[] => {
  const countries = new Map<string, AreaCountry>()
  const whole = new Set<string>()

  for (const zone of geoZones) {
    const isProvince = zone.type === "province" && !!zone.province_code
    if (zone.type !== "country" && !isProvince) continue

    const key = zone.country_code.toLowerCase()
    const country = countries.get(key) ?? {
      iso_2: zone.country_code,
      display_name: displayName(zone.country_code),
      provinces: [],
    }
    if (isProvince) {
      country.provinces = distinct([...country.provinces!, zone.province_code!])
    } else {
      whole.add(key)
    }
    countries.set(key, country)
  }

  // A country the zone also covers whole is covered whole.
  for (const key of whole) {
    countries.get(key)!.provinces = []
  }
  return [...countries.values()]
}

/**
 * A zone's city and zip areas, by id, which its form resends as they are:
 * the service zone update deletes any geo zone it isn't sent.
 */
export const keptGeoZones = (geoZones: GeoZoneLike[]) =>
  geoZones
    .filter((zone) => zone.type !== "country" && zone.type !== "province")
    .map((zone) =>
      Object.fromEntries(
        (["id", "type", "country_code", "province_code", "city", "postal_expression"] as const).flatMap((key) =>
          zone[key] === undefined || zone[key] === null ? [] : [[key, zone[key]]]
        )
      )
    )

/** Another zone of the same fulfillment set. */
export type OtherZone = { id?: string; name: string; geo_zones?: GeoZoneLike[] | null }

/** Of a country, the other zones holding it: all of it, or provinces by lower-case code. */
export type TakenAreas = { whole: OtherZone | null; provinces: Record<string, OtherZone> }

/** An overlap with another zone: the zone, and the areas (province codes, or the country) both would cover. */
export type AreaConflict = { iso_2: string; zone: OtherZone; areas: string[] }

export const takenIn = (otherZones: OtherZone[], iso2: string): TakenAreas => {
  const taken: TakenAreas = { whole: null, provinces: {} }

  for (const zone of otherZones) {
    for (const geo of zone.geo_zones ?? []) {
      if (!geo.country_code || !same(geo.country_code, iso2)) continue
      if (geo.type === "country") {
        taken.whole = taken.whole ?? zone
      } else if (geo.type === "province" && geo.province_code) {
        taken.provinces[geo.province_code.toLowerCase()] = zone
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
      const areas = country.provinces?.length ? distinct(country.provinces) : [country.iso_2]
      conflicts.push({ iso_2: country.iso_2, zone: taken.whole, areas })
      continue
    }

    const wanted = country.provinces?.length ? distinct(country.provinces) : Object.keys(taken.provinces)
    const byZone = new Map<OtherZone, string[]>()
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

const sameZone = (a: OtherZone, b: OtherZone) => a === b || (!!a.id && a.id === b.id)

/**
 * The overlaps an edit adds to the ones the zone already had, so a zone that
 * already overlapped can keep or shrink its overlap: an area overlapped
 * before, or in a country that overlapped whole before, isn't added.
 */
export const addedConflicts = (now: AreaConflict[], before: AreaConflict[]): AreaConflict[] =>
  now.flatMap((conflict) => {
    const had = before.filter((one) => same(one.iso_2, conflict.iso_2) && sameZone(one.zone, conflict.zone))
    const areas = conflict.areas.filter(
      (area) => !had.some((one) => one.areas.some((old) => same(old, area) || same(old, conflict.iso_2)))
    )
    return areas.length ? [{ ...conflict, areas }] : []
  })

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
    const names = chip.kind === "names" ? chip.names : distinct(country.provinces!).map(provinceName)
    return `${country.display_name} · ${names.join(", ")}`
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

/** Whether a country's area covers a province: whole, or listing it. */
export const coversProvince = (area: AreaCountry | undefined, code: string) =>
  !!area && (!area.provinces?.length || area.provinces.some((one) => same(one, code)))

/** Ticked when the zone covers the country whole, or every province no other zone holds. */
export const countryCheck = (areas: AreaCountry[], iso2: string, taken: TakenAreas): boolean | "indeterminate" => {
  const area = areas.find(sameIso(iso2))
  if (!area) return false
  if (!area.provinces?.length) return true
  const free = freeProvinces(iso2, taken)
  return free.length > 0 && free.every((code) => coversProvince(area, code)) ? true : "indeterminate"
}

/** A country's area as the zone saved it, or as picked. */
const areaOf = (areas: AreaCountry[], country: PickedCountry, provinces: string[]): AreaCountry => {
  const saved = areas.find(sameIso(country.iso_2))
  return { iso_2: saved?.iso_2 ?? country.iso_2, display_name: saved?.display_name ?? country.display_name, provinces }
}

const replaceArea = (areas: AreaCountry[], iso2: string, next: AreaCountry | null) => {
  const index = areas.findIndex(sameIso(iso2))
  if (index < 0) return next ? [...areas, next] : areas
  return next ? areas.map((area, i) => (i === index ? next : area)) : areas.filter((_, i) => i !== index)
}

/**
 * Sets a country's provinces: none drops it, and all of the listed ones
 * (none held elsewhere) cover it whole. Listed ones keep the list's order
 * and their saved spelling; codes off the list are kept after them.
 */
const withProvinces = (areas: AreaCountry[], country: PickedCountry, provinces: string[], taken: TakenAreas) => {
  const all = registeredProvinces(country.iso_2).map((province) => province.code)
  const picked = distinct(provinces)
  const listed = all.flatMap((code) => picked.filter((one) => same(one, code)))
  const unlisted = picked.filter((one) => !all.some((code) => same(code, one)))
  const whole =
    !taken.whole && !Object.keys(taken.provinces).length && all.length > 0 && listed.length === all.length
  const next = picked.length ? areaOf(areas, country, whole ? [] : [...listed, ...unlisted]) : null
  return replaceArea(areas, country.iso_2, next)
}

/** Ticks or unticks a country: all of it that is free, or none of it. */
export const toggleCountry = (areas: AreaCountry[], country: PickedCountry, taken: TakenAreas): AreaCountry[] => {
  const area = areas.find(sameIso(country.iso_2))
  // A country another zone holds whole can only be given up.
  if (countryCheck(areas, country.iso_2, taken) === true || (taken.whole && area)) {
    return areas.filter((one) => !sameIso(country.iso_2)(one))
  }
  if (taken.whole) return areas
  if (!Object.keys(taken.provinces).length) {
    // Nothing of it is held: the whole country, provinces listed or not.
    return replaceArea(areas, country.iso_2, areaOf(areas, country, []))
  }
  return withProvinces(areas, country, freeProvinces(country.iso_2, taken), taken)
}

/**
 * Ticks or unticks one province of a country. One another zone holds is
 * never added, though a zone already covering it can give it up.
 */
export const toggleProvince = (
  areas: AreaCountry[],
  country: PickedCountry,
  code: string,
  taken: TakenAreas
): AreaCountry[] => {
  const area = areas.find(sameIso(country.iso_2))
  const on = coversProvince(area, code)
  if (!on && (taken.whole || taken.provinces[code.toLowerCase()])) return areas

  // A whole country splits into what this zone can keep: the free provinces,
  // or all of them where another zone holds it whole too.
  const current = !area
    ? []
    : area.provinces?.length
      ? area.provinces
      : taken.whole
        ? registeredProvinces(country.iso_2).map((province) => province.code)
        : freeProvinces(country.iso_2, taken)
  const next = on ? current.filter((one) => !same(one, code)) : [...current, code]
  return withProvinces(areas, country, next, taken)
}

/** A country ticked again in the every-country table keeps the provinces the zone had. */
export const retickedCountry = (country: PickedCountry, saved: AreaCountry[]): AreaCountry => {
  const before = saved.find(sameIso(country.iso_2))
  return before?.provinces?.length ? { ...country, provinces: before.provinces } : country
}

/** How a country reads on the zone's form: whole, a few provinces by name, or how many of all. */
export type AreaChip = { kind: "whole" } | { kind: "names"; names: string[] } | { kind: "count"; count: number; total: number }

const NAMED_PROVINCES = 3

/** How many of a country's listed provinces an area covers, and of how many. */
export const provinceCount = (country: AreaCountry) => {
  const all = registeredProvinces(country.iso_2)
  const picked = distinct(country.provinces ?? [])
  const count = picked.length ? all.filter((one) => picked.some((code) => same(code, one.code))).length : all.length
  return { count, total: all.length, unlisted: picked.length - count }
}

export const areaChip = (country: AreaCountry): AreaChip => {
  const provinces = distinct(country.provinces ?? [])
  if (!provinces.length) return { kind: "whole" }
  const { count, total, unlisted } = provinceCount(country)
  if (provinces.length <= NAMED_PROVINCES || unlisted > 0 || !total) {
    return { kind: "names", names: provinces.map(provinceName) }
  }
  return { kind: "count", count, total }
}

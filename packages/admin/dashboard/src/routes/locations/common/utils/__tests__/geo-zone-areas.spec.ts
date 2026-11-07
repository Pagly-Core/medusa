import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  areaChip,
  areaConflicts,
  areaLabels,
  countryCheck,
  fromGeoZones,
  provinceName,
  registeredProvinces,
  takenIn,
  toggleCountry,
  toggleProvince,
  toGeoZones,
  zoneCountries,
} from "../geo-zone-areas"

const HOOK = "__paglyProvinces"
const name = (iso2: string) => ({ uy: "Uruguay", ar: "Argentina" })[iso2] ?? iso2

beforeEach(() => {
  ;(globalThis as Record<string, unknown>)[HOOK] = {
    uy: [
      { code: "uy-ma", name: "Maldonado" },
      { code: "uy-mo", name: "Montevideo" },
      { code: "uy-ro", name: "Rocha" },
    ],
  }
})

afterEach(() => {
  delete (globalThis as Record<string, unknown>)[HOOK]
})

describe("a zone's provinces", () => {
  it("are the ones a plugin registered for the country, by name", () => {
    expect(registeredProvinces("UY").map((one) => one.name)).toEqual(["Maldonado", "Montevideo", "Rocha"])
    expect(registeredProvinces("ar")).toEqual([])
    expect(provinceName("uy-mo")).toBe("Montevideo")
    expect(provinceName("ar-b")).toBe("ar-b")
  })

  it("are none anywhere when no plugin registered any", () => {
    delete (globalThis as Record<string, unknown>)[HOOK]
    expect(registeredProvinces("uy")).toEqual([])
    expect(provinceName("uy-mo")).toBe("uy-mo")
  })

  it("save as province areas, and a country without any as the whole country", () => {
    expect(
      toGeoZones([
        { iso_2: "uy", display_name: "Uruguay", provinces: ["uy-ma", "uy-ro"] },
        { iso_2: "ar", display_name: "Argentina" },
        { iso_2: "br", display_name: "Brasil", provinces: [] },
      ])
    ).toEqual([
      { type: "province", country_code: "uy", province_code: "uy-ma" },
      { type: "province", country_code: "uy", province_code: "uy-ro" },
      { type: "country", country_code: "ar" },
      { type: "country", country_code: "br" },
    ])
  })

  it("read back from a zone's areas, one country each", () => {
    expect(
      fromGeoZones(
        [
          { type: "province", country_code: "uy", province_code: "uy-ma" },
          { type: "country", country_code: "ar" },
          { type: "province", country_code: "uy", province_code: "uy-ro" },
        ],
        name
      )
    ).toEqual([
      { iso_2: "uy", display_name: "Uruguay", provinces: ["uy-ma", "uy-ro"] },
      { iso_2: "ar", display_name: "Argentina", provinces: [] },
    ])
  })

  it("read a country the zone covers whole as whole, whatever else it lists for it", () => {
    expect(
      fromGeoZones(
        [
          { type: "province", country_code: "uy", province_code: "uy-ma" },
          { type: "country", country_code: "uy" },
        ],
        name
      )
    ).toEqual([{ iso_2: "uy", display_name: "Uruguay", provinces: [] }])
  })

  it("read as one line per country", () => {
    expect(
      areaLabels(
        [
          { type: "country", country_code: "ar" },
          { type: "province", country_code: "uy", province_code: "uy-ro" },
          { type: "province", country_code: "uy", province_code: "uy-ma" },
        ],
        name
      )
    ).toEqual(["Argentina", "Uruguay · Rocha, Maldonado"])
  })
})

// Pagly: within a location's set an area sits in one zone, so the form shows
// what the set's other zones hold and stops a save that would overlap.
describe("the areas other zones of the set hold", () => {
  const ESTE = {
    id: "serzo_este",
    name: "Este",
    geo_zones: [
      { type: "province", country_code: "uy", province_code: "uy-ma" },
      { type: "province", country_code: "uy", province_code: "uy-ro" },
    ],
  }
  const URUGUAY = { id: "serzo_uy", name: "Nike UY Zone", geo_zones: [{ type: "country", country_code: "uy" }] }

  it("names the zone holding each province, or the whole country", () => {
    expect(takenIn([ESTE], "uy")).toEqual({ whole: null, provinces: { "uy-ma": "Este", "uy-ro": "Este" } })
    expect(takenIn([URUGUAY], "UY")).toEqual({ whole: "Nike UY Zone", provinces: {} })
    expect(takenIn([ESTE], "ar")).toEqual({ whole: null, provinces: {} })
  })

  it("finds a province another zone holds", () => {
    expect(areaConflicts([{ iso_2: "uy", display_name: "Uruguay", provinces: ["uy-mo", "uy-ma"] }], [ESTE])).toEqual([
      { iso_2: "uy", zone: "Este", areas: ["uy-ma"] },
    ])
  })

  it("finds the whole country when another zone holds part of it", () => {
    expect(areaConflicts([{ iso_2: "uy", display_name: "Uruguay", provinces: [] }], [ESTE])).toEqual([
      { iso_2: "uy", zone: "Este", areas: ["uy-ma", "uy-ro"] },
    ])
  })

  it("finds any area of a country another zone holds whole", () => {
    expect(areaConflicts([{ iso_2: "uy", display_name: "Uruguay", provinces: ["uy-mo"] }], [URUGUAY])).toEqual([
      { iso_2: "uy", zone: "Nike UY Zone", areas: ["uy"] },
    ])
  })

  it("finds nothing for areas no other zone holds", () => {
    expect(areaConflicts([{ iso_2: "uy", display_name: "Uruguay", provinces: ["uy-mo"] }], [ESTE])).toEqual([])
    expect(areaConflicts([{ iso_2: "ar", display_name: "Argentina" }], [ESTE, URUGUAY])).toEqual([])
  })
})

// Pagly: the areas picker lists the store's country first, its provinces
// collapsed under it, and no other country yet.
describe("picking a zone's areas", () => {
  const UY = { iso_2: "uy", display_name: "Uruguay" }
  const FREE = { whole: null, provinces: {} }
  const ESTE_HOLDS_MALDONADO = { whole: null, provinces: { "uy-ma": "Este" } }

  afterEach(() => {
    delete (globalThis as Record<string, unknown>).__paglyZoneCountries
  })

  it("offers the countries a plugin registered, lower case, or none to fall back to every country", async () => {
    expect(zoneCountries()).toBeNull()
    ;(globalThis as Record<string, unknown>).__paglyZoneCountries = async () => ["UY"]
    await expect(zoneCountries()).resolves.toEqual(["uy"])
  })

  it("ticks a country covered whole, half-ticks one covered in part, and leaves the rest", () => {
    expect(countryCheck([{ ...UY, provinces: [] }], "uy", FREE)).toBe(true)
    expect(countryCheck([{ ...UY, provinces: ["uy-mo"] }], "uy", FREE)).toBe("indeterminate")
    expect(countryCheck([], "uy", FREE)).toBe(false)
  })

  it("ticks a country whose every free province is in, when another zone holds the rest", () => {
    expect(countryCheck([{ ...UY, provinces: ["uy-mo", "uy-ro"] }], "uy", ESTE_HOLDS_MALDONADO)).toBe(true)
  })

  it("takes the whole country when nothing of it is held, and drops it when ticked again", () => {
    expect(toggleCountry([], UY, FREE)).toEqual([{ ...UY, provinces: [] }])
    expect(toggleCountry([{ ...UY, provinces: ["uy-mo"] }], UY, FREE)).toEqual([{ ...UY, provinces: [] }])
    expect(toggleCountry([{ ...UY, provinces: [] }], UY, FREE)).toEqual([])
  })

  it("takes only the free provinces when another zone holds some", () => {
    expect(toggleCountry([], UY, ESTE_HOLDS_MALDONADO)).toEqual([{ ...UY, provinces: ["uy-mo", "uy-ro"] }])
    expect(toggleCountry([{ ...UY, provinces: ["uy-mo", "uy-ro"] }], UY, ESTE_HOLDS_MALDONADO)).toEqual([])
  })

  it("leaves a country another zone holds whole as it is", () => {
    const held = { whole: "Nike UY Zone", provinces: {} }
    expect(toggleCountry([], UY, held)).toEqual([])
  })

  it("adds and removes one province, keeping the other countries", () => {
    const ar = { iso_2: "ar", display_name: "Argentina", provinces: [] }
    expect(toggleProvince([ar], UY, "uy-mo", FREE)).toEqual([ar, { ...UY, provinces: ["uy-mo"] }])
    expect(toggleProvince([ar, { ...UY, provinces: ["uy-mo", "uy-ro"] }], UY, "uy-mo", FREE)).toEqual([
      ar,
      { ...UY, provinces: ["uy-ro"] },
    ])
    expect(toggleProvince([ar, { ...UY, provinces: ["uy-mo"] }], UY, "uy-mo", FREE)).toEqual([ar])
  })

  it("splits a whole country when one of its provinces is unticked", () => {
    expect(toggleProvince([{ ...UY, provinces: [] }], UY, "uy-mo", FREE)).toEqual([
      { ...UY, provinces: ["uy-ma", "uy-ro"] },
    ])
  })

  it("covers the country whole once every province is in, unless another zone holds one", () => {
    expect(toggleProvince([{ ...UY, provinces: ["uy-ma", "uy-mo"] }], UY, "uy-ro", FREE)).toEqual([
      { ...UY, provinces: [] },
    ])
    expect(toggleProvince([{ ...UY, provinces: ["uy-mo"] }], UY, "uy-ro", ESTE_HOLDS_MALDONADO)).toEqual([
      { ...UY, provinces: ["uy-mo", "uy-ro"] },
    ])
  })

  it("never picks a province another zone holds", () => {
    expect(toggleProvince([], UY, "uy-ma", ESTE_HOLDS_MALDONADO)).toEqual([])
  })

  it("reads a country as whole, a few provinces by name, or a count of many", () => {
    expect(areaChip({ ...UY, provinces: [] })).toEqual({ kind: "whole" })
    expect(areaChip({ ...UY, provinces: ["uy-ma", "uy-ro"] })).toEqual({ kind: "names", names: ["Maldonado", "Rocha"] })
    ;(globalThis as Record<string, unknown>).__paglyProvinces = {
      uy: ["a", "b", "c", "d", "e"].map((code) => ({ code, name: code.toUpperCase() })),
    }
    expect(areaChip({ ...UY, provinces: ["a", "b", "c", "d"] })).toEqual({ kind: "count", count: 4, total: 5 })
  })
})

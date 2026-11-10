import { afterEach, describe, expect, it } from "vitest"

import {
  addedConflicts,
  areaChip,
  areaConflicts,
  areaLabels,
  countryCheck,
  fromGeoZones,
  keptGeoZones,
  provinceName,
  registeredProvinces,
  retickedCountry,
  takenIn,
  toggleCountry,
  toggleProvince,
  toGeoZones,
  zoneCountries,
} from "../geo-zone-areas"

const name = (iso2: string) => ({ uy: "Uruguay", ar: "Argentina" })[iso2.toLowerCase()] ?? iso2

// Uruguay's 19 departamentos, in the bundled table's order.
const UY_ALL = [
  "uy-ar", "uy-ca", "uy-cl", "uy-co", "uy-du", "uy-fd", "uy-fs", "uy-la", "uy-ma", "uy-mo",
  "uy-pa", "uy-rn", "uy-rv", "uy-ro", "uy-sa", "uy-sj", "uy-so", "uy-ta", "uy-tt",
]
const except = (...codes: string[]) => UY_ALL.filter((code) => !codes.includes(code))

describe("a zone's provinces", () => {
  it("are the dashboard's own list for the country, lower case, by name", () => {
    expect(registeredProvinces("UY").map((one) => one.code)).toEqual(UY_ALL)
    expect(registeredProvinces("uy").find((one) => one.code === "uy-mo")?.name).toBe("Montevideo")
    expect(provinceName("uy-mo")).toBe("Montevideo")
    expect(provinceName("UY-MO")).toBe("Montevideo")
    expect(provinceName("xx-zz")).toBe("xx-zz")
  })

  it("name Florida and Flores by their ISO 3166-2 codes", () => {
    expect(provinceName("uy-fd")).toBe("Florida")
    expect(provinceName("uy-fs")).toBe("Flores")
  })

  it("need no plugin", () => {
    expect((globalThis as Record<string, unknown>).__paglyProvinces).toBeUndefined()
    expect(registeredProvinces("uy")).toHaveLength(19)
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

  it("read a country's codes as one country, whatever their case", () => {
    expect(
      fromGeoZones(
        [
          { type: "province", country_code: "UY", province_code: "UY-MA" },
          { type: "province", country_code: "uy", province_code: "uy-ro" },
        ],
        name
      )
    ).toEqual([{ iso_2: "UY", display_name: "Uruguay", provinces: ["UY-MA", "uy-ro"] }])
  })

  it("leave city and zip areas out of the form, never widening them to the country", () => {
    const zip = {
      id: "fgz_zip",
      type: "zip",
      country_code: "uy",
      province_code: "uy-ma",
      city: "Maldonado",
      postal_expression: { type: "range", from: "20000", to: "20100" },
    }
    const city = { id: "fgz_city", type: "city", country_code: "ar", province_code: "ar-b", city: "La Plata" }
    expect(
      fromGeoZones([{ type: "province", country_code: "uy", province_code: "uy-mo" }, zip], name)
    ).toEqual([{ iso_2: "uy", display_name: "Uruguay", provinces: ["uy-mo"] }])
    expect(fromGeoZones([zip, city], name)).toEqual([])
  })

  it("keep a zone's city and zip areas as they are when its form saves", () => {
    const zip = {
      id: "fgz_zip",
      type: "zip",
      country_code: "uy",
      province_code: "uy-ma",
      city: "Maldonado",
      postal_expression: { type: "range", from: "20000", to: "20100" },
      metadata: null,
    }
    const city = { id: "fgz_city", type: "city", country_code: "ar", province_code: "ar-b", city: "La Plata" }
    expect(
      keptGeoZones([{ id: "fgz_mo", type: "province", country_code: "uy", province_code: "uy-mo" }, zip, city])
    ).toEqual([
      {
        id: "fgz_zip",
        type: "zip",
        country_code: "uy",
        province_code: "uy-ma",
        city: "Maldonado",
        postal_expression: { type: "range", from: "20000", to: "20100" },
      },
      { id: "fgz_city", type: "city", country_code: "ar", province_code: "ar-b", city: "La Plata" },
    ])
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

  it("count many provinces instead of naming them all", () => {
    expect(
      areaLabels(
        except("uy-ma", "uy-ro", "uy-mo").map((code) => ({ type: "province", country_code: "uy", province_code: code })),
        name,
        (count, total) => `${count} de ${total}`
      )
    ).toEqual(["Uruguay · 16 de 19"])
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

  it("knows the zone holding each province, or the whole country", () => {
    expect(takenIn([ESTE], "uy")).toEqual({ whole: null, provinces: { "uy-ma": ESTE, "uy-ro": ESTE } })
    expect(takenIn([URUGUAY], "UY")).toEqual({ whole: URUGUAY, provinces: {} })
    expect(takenIn([ESTE], "ar")).toEqual({ whole: null, provinces: {} })
  })

  it("holds an area for a zone with no name too", () => {
    const unnamed = { id: "serzo_x", name: "", geo_zones: [{ type: "country", country_code: "uy" }] }
    expect(takenIn([unnamed], "uy").whole).toBe(unnamed)
    expect(toggleCountry([], { iso_2: "uy", display_name: "Uruguay" }, takenIn([unnamed], "uy"))).toEqual([])
    expect(areaConflicts([{ iso_2: "uy", display_name: "Uruguay", provinces: [] }], [unnamed])).toHaveLength(1)
  })

  it("finds a province another zone holds", () => {
    expect(areaConflicts([{ iso_2: "uy", display_name: "Uruguay", provinces: ["uy-mo", "uy-ma"] }], [ESTE])).toEqual([
      { iso_2: "uy", zone: ESTE, areas: ["uy-ma"] },
    ])
  })

  it("finds the whole country when another zone holds part of it", () => {
    expect(areaConflicts([{ iso_2: "uy", display_name: "Uruguay", provinces: [] }], [ESTE])).toEqual([
      { iso_2: "uy", zone: ESTE, areas: ["uy-ma", "uy-ro"] },
    ])
  })

  it("finds any area of a country another zone holds whole", () => {
    expect(areaConflicts([{ iso_2: "uy", display_name: "Uruguay", provinces: ["uy-mo"] }], [URUGUAY])).toEqual([
      { iso_2: "uy", zone: URUGUAY, areas: ["uy-mo"] },
    ])
    expect(areaConflicts([{ iso_2: "uy", display_name: "Uruguay", provinces: [] }], [URUGUAY])).toEqual([
      { iso_2: "uy", zone: URUGUAY, areas: ["uy"] },
    ])
  })

  it("finds nothing for areas no other zone holds", () => {
    expect(areaConflicts([{ iso_2: "uy", display_name: "Uruguay", provinces: ["uy-mo"] }], [ESTE])).toEqual([])
    expect(areaConflicts([{ iso_2: "ar", display_name: "Argentina" }], [ESTE, URUGUAY])).toEqual([])
  })

  it("lets a zone that already overlapped keep or shrink its overlap, but not grow it", () => {
    // "Este" holds Maldonado while "Nike UY Zone" covers all of Uruguay.
    const before = areaConflicts([{ iso_2: "uy", display_name: "Uruguay", provinces: ["uy-ma"] }], [URUGUAY])
    const now = (provinces: string[]) =>
      addedConflicts(areaConflicts([{ iso_2: "uy", display_name: "Uruguay", provinces }], [URUGUAY]), before)
    expect(now(["uy-ma"])).toEqual([])
    expect(now(["uy-ma", "uy-ro"])).toEqual([{ iso_2: "uy", zone: URUGUAY, areas: ["uy-ro"] }])
  })

  it("lets a zone that covered a country whole alongside another keep any part of it", () => {
    const before = areaConflicts([{ iso_2: "uy", display_name: "Uruguay", provinces: [] }], [URUGUAY])
    const now = addedConflicts(
      areaConflicts([{ iso_2: "uy", display_name: "Uruguay", provinces: except("uy-mo") }], [URUGUAY]),
      before
    )
    expect(now).toEqual([])
  })

  it("counts every overlap as added for a new zone", () => {
    const now = areaConflicts([{ iso_2: "uy", display_name: "Uruguay", provinces: ["uy-ma"] }], [ESTE])
    expect(addedConflicts(now, [])).toEqual(now)
  })
})

// Pagly: the areas picker lists the store's country first, its provinces
// collapsed under it, and no other country yet.
describe("picking a zone's areas", () => {
  const UY = { iso_2: "uy", display_name: "Uruguay" }
  const FREE = { whole: null, provinces: {} }
  const ESTE = { id: "serzo_este", name: "Este" }
  const NIKE = { id: "serzo_uy", name: "Nike UY Zone" }
  const ESTE_HOLDS_MALDONADO = { whole: null, provinces: { "uy-ma": ESTE } }
  const NIKE_HOLDS_ALL = { whole: NIKE, provinces: {} }

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
    expect(countryCheck([{ ...UY, provinces: except("uy-ma") }], "uy", ESTE_HOLDS_MALDONADO)).toBe(true)
  })

  it("matches a country and its provinces whatever their case", () => {
    const upper = [{ iso_2: "UY", display_name: "Uruguay", provinces: except("uy-ma").map((one) => one.toUpperCase()) }]
    expect(countryCheck(upper, "uy", ESTE_HOLDS_MALDONADO)).toBe(true)
    expect(toggleProvince([{ iso_2: "UY", display_name: "Uruguay", provinces: ["UY-MO"] }], UY, "uy-mo", FREE)).toEqual([])
  })

  it("takes the whole country when nothing of it is held, and drops it when ticked again", () => {
    expect(toggleCountry([], UY, FREE)).toEqual([{ ...UY, provinces: [] }])
    expect(toggleCountry([{ ...UY, provinces: ["uy-mo"] }], UY, FREE)).toEqual([{ ...UY, provinces: [] }])
    expect(toggleCountry([{ ...UY, provinces: [] }], UY, FREE)).toEqual([])
  })

  it("keeps a country's code as the zone saved it", () => {
    expect(toggleCountry([{ iso_2: "UY", display_name: "Uruguay", provinces: ["uy-mo"] }], UY, FREE)).toEqual([
      { iso_2: "UY", display_name: "Uruguay", provinces: [] },
    ])
    expect(toggleProvince([{ iso_2: "UY", display_name: "Uruguay", provinces: ["uy-mo"] }], UY, "uy-ro", FREE)).toEqual([
      { iso_2: "UY", display_name: "Uruguay", provinces: ["uy-mo", "uy-ro"] },
    ])
  })

  it("takes only the free provinces when another zone holds some", () => {
    expect(toggleCountry([], UY, ESTE_HOLDS_MALDONADO)).toEqual([{ ...UY, provinces: except("uy-ma") }])
    expect(toggleCountry([{ ...UY, provinces: except("uy-ma") }], UY, ESTE_HOLDS_MALDONADO)).toEqual([])
  })

  it("leaves a country another zone holds whole as it is, unless this zone has it", () => {
    expect(toggleCountry([], UY, NIKE_HOLDS_ALL)).toEqual([])
    expect(toggleCountry([{ ...UY, provinces: [] }], UY, NIKE_HOLDS_ALL)).toEqual([])
    expect(toggleCountry([{ ...UY, provinces: ["uy-ma"] }], UY, NIKE_HOLDS_ALL)).toEqual([])
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
      { ...UY, provinces: except("uy-mo") },
    ])
  })

  it("splits a whole country into the free provinces, leaving out the ones another zone holds", () => {
    expect(toggleProvince([{ ...UY, provinces: [] }], UY, "uy-mo", ESTE_HOLDS_MALDONADO)).toEqual([
      { ...UY, provinces: except("uy-mo", "uy-ma") },
    ])
  })

  it("covers the country whole once every province is in, unless another zone holds one", () => {
    expect(toggleProvince([{ ...UY, provinces: except("uy-ro") }], UY, "uy-ro", FREE)).toEqual([
      { ...UY, provinces: [] },
    ])
    expect(toggleProvince([{ ...UY, provinces: ["uy-mo"] }], UY, "uy-ro", ESTE_HOLDS_MALDONADO)).toEqual([
      { ...UY, provinces: ["uy-mo", "uy-ro"] },
    ])
  })

  it("keeps the codes the list doesn't have, and never reads losing the rest as the whole country", () => {
    expect(toggleProvince([{ ...UY, provinces: ["uy-mo", "UY-XX"] }], UY, "uy-mo", FREE)).toEqual([
      { ...UY, provinces: ["UY-XX"] },
    ])
    expect(toggleProvince([{ ...UY, provinces: ["UY-MO", "UY-CA"] }], UY, "uy-ma", FREE)).toEqual([
      { ...UY, provinces: ["UY-CA", "uy-ma", "UY-MO"] },
    ])
  })

  it("ticks and unticks a country with no listed provinces, as a whole", () => {
    const XK = { iso_2: "xk", display_name: "Kosovo" }
    expect(countryCheck([], "xk", FREE)).toBe(false)
    expect(toggleCountry([], XK, FREE)).toEqual([{ ...XK, provinces: [] }])
    expect(countryCheck([{ ...XK, provinces: [] }], "xk", FREE)).toBe(true)
    expect(toggleCountry([{ ...XK, provinces: [] }], XK, FREE)).toEqual([])
    expect(toggleCountry([], XK, { whole: { name: "Kosovo" }, provinces: {} })).toEqual([])
  })

  it("covers the country whole again from part of it, keeping its place among the others", () => {
    const ar = { iso_2: "ar", display_name: "Argentina", provinces: [] }
    expect(toggleCountry([{ ...UY, provinces: ["uy-mo"] }, ar], UY, FREE)).toEqual([{ ...UY, provinces: [] }, ar])
  })

  it("never adds a province another zone holds", () => {
    expect(toggleProvince([], UY, "uy-ma", ESTE_HOLDS_MALDONADO)).toEqual([])
    expect(toggleProvince([{ ...UY, provinces: ["uy-mo"] }], UY, "uy-ma", NIKE_HOLDS_ALL)).toEqual([
      { ...UY, provinces: ["uy-mo"] },
    ])
  })

  it("lets a zone give up a province another zone also holds", () => {
    expect(toggleProvince([{ ...UY, provinces: ["uy-mo", "uy-ma"] }], UY, "uy-ma", ESTE_HOLDS_MALDONADO)).toEqual([
      { ...UY, provinces: ["uy-mo"] },
    ])
    expect(toggleProvince([{ ...UY, provinces: ["uy-mo", "uy-ma"] }], UY, "uy-ma", NIKE_HOLDS_ALL)).toEqual([
      { ...UY, provinces: ["uy-mo"] },
    ])
  })

  it("reads a country as whole, a few provinces by name, or a count of many", () => {
    expect(areaChip({ ...UY, provinces: [] })).toEqual({ kind: "whole" })
    expect(areaChip({ ...UY, provinces: ["uy-ma", "uy-ro"] })).toEqual({ kind: "names", names: ["Maldonado", "Rocha"] })
    expect(areaChip({ ...UY, provinces: except("uy-ma", "uy-ro", "uy-mo") })).toEqual({
      kind: "count",
      count: 16,
      total: 19,
    })
  })

  it("never counts more provinces than the country has, or out of none", () => {
    expect(areaChip({ ...UY, provinces: [...UY_ALL, "uy-mo"] })).toEqual({ kind: "count", count: 19, total: 19 })
    const XK = { iso_2: "xk", display_name: "Kosovo" }
    expect(areaChip({ ...XK, provinces: ["xk-1", "xk-2", "xk-3", "xk-4"] })).toEqual({
      kind: "names",
      names: ["xk-1", "xk-2", "xk-3", "xk-4"],
    })
  })

  it("keeps a re-ticked country's provinces in the every-country table", () => {
    const saved = [{ iso_2: "uy", display_name: "Uruguay", provinces: ["uy-ma", "uy-ro"] }]
    expect(retickedCountry(UY, saved)).toEqual({ ...UY, provinces: ["uy-ma", "uy-ro"] })
    expect(retickedCountry({ iso_2: "ar", display_name: "Argentina" }, saved)).toEqual({
      iso_2: "ar",
      display_name: "Argentina",
    })
  })
})

import { afterEach, beforeEach, describe, expect, it } from "vitest"

import {
  areaLabels,
  fromGeoZones,
  provinceName,
  registeredProvinces,
  toGeoZones,
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

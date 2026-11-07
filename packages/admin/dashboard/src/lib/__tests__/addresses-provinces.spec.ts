import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { getFormattedAddress } from "../addresses"

beforeEach(() => {
  ;(globalThis as Record<string, unknown>).__paglyProvinces = {
    uy: [{ code: "uy-mo", name: "Montevideo" }],
  }
})

afterEach(() => {
  delete (globalThis as Record<string, unknown>).__paglyProvinces
})

// Pagly: checkout saves a province by the code a plugin registers.
describe("an address's province", () => {
  it("reads by the name a plugin registered for its code", () => {
    const lines = getFormattedAddress({
      address: { city: "Pocitos", province: "uy-mo", postal_code: "11300", country_code: "uy" } as never,
    })
    expect(lines).toContain("Pocitos Montevideo 11300")
  })

  it("reads as it is when nobody registered it", () => {
    const lines = getFormattedAddress({
      address: { city: "La Plata", province: "Buenos Aires", country_code: "ar" } as never,
    })
    expect(lines).toContain("La Plata Buenos Aires")
  })
})

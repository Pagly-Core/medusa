import { describe, expect, it, vi } from "vitest"

// The dashboard's province names (its lib/provinces), as the admin loads them.
vi.mock("@medusajs/dashboard/lib", () => ({
  provinceName: (code: string) => (code.toLowerCase() === "uy-mo" ? "Montevideo" : code),
}))

import { getFormattedAddress } from "../address-utils"

// Pagly: checkout saves a province by its code; a draft order reads its name,
// like the order page.
describe("a draft order's address", () => {
  it("reads its province by name", () => {
    const lines = getFormattedAddress({ city: "Pocitos", province: "uy-mo", postal_code: "11300", country_code: "uy" } as never)
    expect(lines).toContain("Pocitos Montevideo 11300")
  })

  it("reads a province that isn't a code as it is", () => {
    const lines = getFormattedAddress({ city: "La Plata", province: "Buenos Aires", country_code: "ar" } as never)
    expect(lines).toContain("La Plata Buenos Aires")
  })
})

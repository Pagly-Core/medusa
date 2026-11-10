import { describe, expect, it } from "vitest"

import { getFormattedAddress } from "../addresses"
import { getCellRenderer } from "../table/cell-renderers"

const POCITOS = { city: "Pocitos", province: "uy-mo", postal_code: "11300", country_code: "uy" }

// Pagly: checkout saves a province by its lower-case ISO 3166-2 code.
describe("an address's province", () => {
  it("reads by its name", () => {
    const lines = getFormattedAddress({ address: POCITOS as never })
    expect(lines).toContain("Pocitos Montevideo 11300")
  })

  it("reads as it is when it isn't a known code", () => {
    const lines = getFormattedAddress({
      address: { city: "La Plata", province: "Buenos Aires", country_code: "ar" } as never,
    })
    expect(lines).toContain("La Plata Buenos Aires")
  })

  it("reads by its name in a table's address column too", () => {
    const { render } = getCellRenderer("address")
    const cell = render(
      null,
      { shipping_address: POCITOS },
      { metadata: { address_field: "shipping_address" } } as never,
      ((key: string) => key) as never
    ) as { props: { text: string } }
    expect(cell.props.text).toBe("Pocitos, Montevideo, 11300 • UY")
  })
})

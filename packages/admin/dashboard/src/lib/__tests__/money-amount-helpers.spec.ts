import { describe, expect, it } from "vitest"

import { getLocaleAmount } from "../money-amount-helpers"

// Pagly: rates on a location read in whole pesos when there are no cents.
describe("an amount in its currency", () => {
  it("keeps its cents by default", () => {
    expect(getLocaleAmount(290, "usd")).toMatch(/290[.,]00/)
  })

  it("reads a whole amount without cents when asked", () => {
    expect(getLocaleAmount(290, "usd", { wholeWithoutCents: true })).not.toMatch(/290[.,]00/)
    expect(getLocaleAmount(12.5, "usd", { wholeWithoutCents: true })).toMatch(/12[.,]50/)
  })
})

import { describe, expect, it } from "vitest"

import { isOptionShownInStore } from "../shipping-options"

const option = (rules: { attribute: string; operator: string; value: unknown }[]) => ({ rules }) as never

// Pagly: checkout offers an option unless one of its rules turns it off, so
// one with no `enabled_in_store` rule is shown (listShippingOptionsForContext).
describe("whether checkout offers a shipping option", () => {
  it("offers one with no rules, or no rule about the store", () => {
    expect(isOptionShownInStore(option([]))).toBe(true)
    expect(isOptionShownInStore({} as never)).toBe(true)
    expect(isOptionShownInStore(option([{ attribute: "is_return", operator: "eq", value: "false" }]))).toBe(true)
  })

  it("offers one switched on for the store", () => {
    expect(isOptionShownInStore(option([{ attribute: "enabled_in_store", operator: "eq", value: "true" }]))).toBe(true)
  })

  it("hides one switched off for the store", () => {
    expect(isOptionShownInStore(option([{ attribute: "enabled_in_store", operator: "eq", value: "false" }]))).toBe(false)
    expect(isOptionShownInStore(option([{ attribute: "enabled_in_store", operator: "ne", value: "true" }]))).toBe(false)
    expect(isOptionShownInStore(option([{ attribute: "enabled_in_store", operator: "in", value: ["false"] }]))).toBe(false)
  })
})

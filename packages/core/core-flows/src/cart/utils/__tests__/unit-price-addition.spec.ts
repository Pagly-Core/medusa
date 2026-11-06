import { BigNumber, MathBN } from "@medusajs/framework/utils"
import { withUnitPriceAddition } from "../unit-price-addition"

const amount = (value: unknown) => MathBN.convert(value as any).toNumber()

const salePriceSet = () => ({
  id: "pset_1",
  is_calculated_price_tax_inclusive: true,
  calculated_amount: 1000,
  original_amount: 1500,
  calculated_price: { price_list_type: "sale" },
  original_price: { price_list_type: null },
})

const deepFreeze = <T>(value: T): T => {
  if (value && typeof value === "object") {
    Object.values(value).forEach(deepFreeze)
    Object.freeze(value)
  }
  return value
}

describe("withUnitPriceAddition", () => {
  it("adds the amount to the calculated and the original amount", () => {
    const priced = withUnitPriceAddition(salePriceSet(), 350)

    expect(amount(priced.calculated_amount)).toEqual(1350)
    expect(amount(priced.original_amount)).toEqual(1850)
  })

  it("keeps every other field of the price set", () => {
    const priced = withUnitPriceAddition(salePriceSet(), 350)

    expect(priced).toEqual(
      expect.objectContaining({
        id: "pset_1",
        is_calculated_price_tax_inclusive: true,
        calculated_price: { price_list_type: "sale" },
        original_price: { price_list_type: null },
      })
    )
  })

  it("returns a copy and never changes the price set it was given", () => {
    // The price set step hands the same object to every line of a variant
    // priced in the same context, so a change here would leak to other lines.
    const set = deepFreeze(salePriceSet())

    const priced = withUnitPriceAddition(set, 350)

    expect(priced).not.toBe(set)
    expect(set).toEqual(salePriceSet())
  })

  it("adds to BigNumber and string amounts", () => {
    const priced = withUnitPriceAddition(
      {
        calculated_amount: new BigNumber(1000),
        original_amount: "1500",
      },
      350
    )

    expect(amount(priced.calculated_amount)).toEqual(1350)
    expect(amount(priced.original_amount)).toEqual(1850)
  })

  it("adds decimal amounts without floating point drift", () => {
    const priced = withUnitPriceAddition(
      { calculated_amount: 10.1, original_amount: 10.1 },
      0.2
    )

    expect(amount(priced.calculated_amount)).toEqual(10.3)
    expect(amount(priced.original_amount)).toEqual(10.3)
  })

  it("leaves a missing original amount missing", () => {
    const priced = withUnitPriceAddition(
      { calculated_amount: 1000, original_amount: null },
      350
    )

    expect(amount(priced.calculated_amount)).toEqual(1350)
    expect(priced.original_amount).toBeNull()
  })

  it("returns the same price set when the addition is 0", () => {
    const set = salePriceSet()

    expect(withUnitPriceAddition(set, 0)).toBe(set)
  })

  it("returns the same price set when there is no addition", () => {
    const set = salePriceSet()

    expect(withUnitPriceAddition(set, undefined)).toBe(set)
    expect(withUnitPriceAddition(set)).toBe(set)
  })
})

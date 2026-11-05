import { BigNumberInput } from "@medusajs/framework/types"

/**
 * The part of a calculated price set that a unit price addition changes.
 */
export interface UnitPriceAdditionPriceSet {
  calculated_amount: BigNumberInput
  original_amount?: BigNumberInput | null
}

/**
 * Returns the price set with `addition` added to its calculated and original
 * amounts.
 *
 * Red-phase stub: returns the price set unchanged.
 */
export function withUnitPriceAddition<T extends UnitPriceAdditionPriceSet>(
  set: T,
  addition?: number
): T {
  return set
}

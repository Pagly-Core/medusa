import { BigNumberInput } from "@medusajs/framework/types"
import { MathBN } from "@medusajs/framework/utils"

/**
 * An item the `setUnitPriceAdditions` hook prices: a cart line item, or an item
 * being added or created, at the quantity it's priced for. Other fields of the
 * line item or the added item are passed through as well.
 */
export interface UnitPriceAdditionsHookItem {
  id?: string
  variant_id?: string | null
  product_id?: string | null
  quantity?: BigNumberInput
  unit_price?: BigNumberInput | null
  is_custom_price?: boolean | null
  metadata?: Record<string, unknown> | null
}

/**
 * The part of a calculated price set that a unit price addition changes.
 */
export interface UnitPriceAdditionPriceSet {
  calculated_amount: BigNumberInput
  original_amount?: BigNumberInput | null
}

/**
 * Returns the price set with `addition` added to its calculated and original
 * amounts, so a line's unit price and its sale compare-at price both carry the
 * addition. An addition of 0 or none returns the price set itself.
 *
 * The price set is never changed: the price set step hands the same object to
 * every line of a variant priced in the same context, so the result is a copy.
 *
 * Pagly: used by the `setUnitPriceAdditions` hook (Personalización add-ons).
 */
export function withUnitPriceAddition<T extends UnitPriceAdditionPriceSet>(
  set: T,
  addition?: number
): T {
  if (!addition) {
    return set
  }

  return {
    ...set,
    calculated_amount: MathBN.add(set.calculated_amount, addition),
    original_amount:
      set.original_amount != null
        ? MathBN.add(set.original_amount, addition)
        : set.original_amount,
  }
}

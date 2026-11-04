/**
 * Pagly: the metadata a gift card's credit line carries, so a cart or an order
 * can name the card by the last four characters of its code without exposing
 * the code itself. Order credit lines copy it from the cart's at checkout.
 *
 * @param code - The gift card's code.
 * @returns The credit line metadata.
 *
 * @example
 * giftCardCreditLineMetadata("GIFT-AAAA-BBBB-CCCC-7KQ2")
 * // { code_last4: "7KQ2" }
 */
export function giftCardCreditLineMetadata(code: string): {
  code_last4: string
} {
  return { code_last4: code.slice(-4) }
}

import { OrderCreditLineDTO } from "@medusajs/types"

type CreditLine = Pick<OrderCreditLineDTO, "metadata">

/**
 * Pagly: what names a kind of credit line in the order summary.
 */
export type CreditKind = {
  /** The credit line `reference` this kind names. */
  reference: string
  /** The translation key of the line's name. */
  labelKey: string
  /** What follows the name, such as a gift card's last four characters. */
  detail?: (creditLine: CreditLine) => string | undefined
}

/**
 * Pagly: the credit lines written today, by the loyalty plugin's cart refresh
 * (gift cards and store credit spent on the order) and by the admin's "refund
 * as store credit". A reference no kind knows keeps upstream's row.
 */
export const CREDIT_KINDS: CreditKind[] = [
  {
    reference: "gift-card",
    labelKey: "orders.creditLines.kinds.giftCard",
    detail: (creditLine) => {
      const last4 = creditLine.metadata?.code_last4

      return typeof last4 === "string" && last4 ? `•••• ${last4}` : undefined
    },
  },
  {
    reference: "store-credit",
    labelKey: "orders.creditLines.kinds.storeCredit",
  },
  {
    reference: "refund",
    labelKey: "orders.creditLines.kinds.refund",
  },
]

export const getCreditKind = (
  reference?: string | null
): CreditKind | undefined =>
  CREDIT_KINDS.find((kind) => kind.reference === reference)

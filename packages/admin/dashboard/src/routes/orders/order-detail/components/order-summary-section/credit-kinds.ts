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

export const CREDIT_KINDS: CreditKind[] = []

export const getCreditKind = (
  _reference?: string | null
): CreditKind | undefined => undefined

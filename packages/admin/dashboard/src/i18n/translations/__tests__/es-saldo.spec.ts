import { describe, expect, test } from "vitest"

import es from "../es.json"

/**
 * Pagly: in Spanish, store credit is "saldo", never "crédito" (a word Pagly's
 * payments copy keeps for credit cards). Gift cards, order credit lines,
 * refunds as store credit and their totals all say "saldo".
 */

function flatten(value: unknown, prefix = ""): [string, string][] {
  if (typeof value === "string") {
    return [[prefix, value]]
  }
  if (!value || typeof value !== "object") {
    return []
  }
  return Object.entries(value).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key)
  )
}

const LOYALTY_KEYS = [
  /^giftCards\./,
  /^orders\.creditLines\./,
  /^orders\.balanceSettlement\./,
  /^orders\.giftCardsStoreCreditLines$/,
  /^orders\.payment\.(storeCreditRefund|totalStoreCreditRefunds)$/,
  /^fields\.creditTotal$/,
]

const loyaltyStrings = flatten(es).filter(([key]) =>
  LOYALTY_KEYS.some((pattern) => pattern.test(key))
)

describe("store credit is saldo in Spanish", () => {
  test("covers the loyalty strings", () => {
    expect(loyaltyStrings.length).toBeGreaterThan(20)
  })

  test.each(loyaltyStrings)("%s never says crédito", (_key, value) => {
    expect(value).not.toMatch(/cr[ée]dito/i)
  })

  test("the refund drawer's title does not use saldo for the order's balance", () => {
    const [, title] = loyaltyStrings.find(
      ([key]) => key === "orders.balanceSettlement.title"
    )!

    expect(title).not.toMatch(/saldo/i)
  })
})

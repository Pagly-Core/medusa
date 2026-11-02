import { describe, expect, it } from "vitest"

import en from "../../../../../../i18n/translations/en.json"
import es from "../../../../../../i18n/translations/es.json"
import { CREDIT_KINDS, getCreditKind } from "../credit-kinds"

/**
 * Pagly: every credit line the loyalty plugin and the admin write has a kind
 * that names it, in English and Spanish. Adding a kind (cashback, say) means a
 * registry line and its labels; this spec fails until both are there.
 */

// What writes credit lines on orders: the loyalty plugin's cart refresh
// (`gift-card`, `store-credit`) and the admin's "refund as store credit"
// (`refund`).
const REFERENCES = ["gift-card", "store-credit", "refund"]

const lookup = (translations: unknown, key: string) =>
  key
    .split(".")
    .reduce<any>((node, part) => (node ? node[part] : undefined), translations)

describe("credit kinds", () => {
  it("has one kind per credit line reference written today", () => {
    expect(CREDIT_KINDS.map((kind) => kind.reference)).toEqual(REFERENCES)
  })

  it.each(REFERENCES)("labels %s in English and Spanish", (reference) => {
    const kind = getCreditKind(reference)!

    expect(typeof lookup(en, kind.labelKey)).toBe("string")
    expect(typeof lookup(es, kind.labelKey)).toBe("string")
    expect(lookup(es, kind.labelKey)).not.toMatch(/cr[ée]dito/i)
  })

  it("knows nothing of other references", () => {
    expect(getCreditKind("loyalty-points")).toBeUndefined()
    expect(getCreditKind(null)).toBeUndefined()
  })

  it("names a gift card by the last four characters its line carries", () => {
    const giftCard = getCreditKind("gift-card")!

    expect(giftCard.detail?.({ metadata: { code_last4: "7KQ2" } } as any)).toBe(
      "•••• 7KQ2"
    )
    expect(giftCard.detail?.({ metadata: {} } as any)).toBeUndefined()
    expect(giftCard.detail?.({ metadata: null } as any)).toBeUndefined()
  })
})

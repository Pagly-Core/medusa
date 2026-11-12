import {
  giftCardAllowedFields,
  giftCardRelationAllowedFields,
  retrieveGiftCardTransformQueryConfig,
} from "../query-config"

// Pagly: store routes are public. A gift card read by its code, or a cart's
// cards, shows what the holder needs of the card's account: its balance.
// Who owns the account, its own code (the one a saldo claim takes) and its
// metadata stay in the admin.
const HIDDEN = ["customer_id", "code", "metadata"]

describe("store gift card fields", () => {
  it("allows the account's id, currency and balance", () => {
    for (const field of ["id", "currency_code", "balance", "credits", "debits"]) {
      expect(giftCardAllowedFields).toContain(`store_credit_account.${field}`)
    }
  })

  it("never allows the account's owner, code or metadata", () => {
    for (const field of HIDDEN) {
      expect(giftCardAllowedFields).not.toContain(`store_credit_account.${field}`)
      expect(giftCardRelationAllowedFields).not.toContain(`gift_cards.store_credit_account.${field}`)
    }
    expect(retrieveGiftCardTransformQueryConfig.allowed).toEqual(giftCardAllowedFields)
  })

  it("keeps the card's own code, which its holder typed", () => {
    expect(giftCardAllowedFields).toContain("code")
  })
})

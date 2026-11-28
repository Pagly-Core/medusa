import { describe, expect, it } from "vitest"

import es from "../../i18n/translations/es.json"
import { currencyName } from "../currency-name"

// Pagly-Core/pagly-app#267: the currency lists said "Uruguayan Peso" in a
// Spanish admin: the name is the currency module's seeded English row.
describe("a currency's name", () => {
  it("is in the admin's language", () => {
    expect(currencyName("uyu", "Uruguayan Peso", "es").toLowerCase()).toBe("peso uruguayo")
    expect(currencyName("USD", "US Dollar", "en")).toBe("US Dollar")
  })

  it("keeps the stored name for a code the language doesn't know", () => {
    expect(currencyName("zzz", "Pagly Coin", "es")).toBe("Pagly Coin")
  })
})

// Pagly-Core/pagly-app#267: product create said "Código medio" and "Código
// arancelario" where every other screen says "Código MID" and "Código HS".
describe("the product's codes", () => {
  it("are named on create as everywhere else", () => {
    expect(es.products.fields.mid_code.label).toBe(es.fields.midCode)
    expect(es.products.fields.hs_code.label).toBe(es.fields.hsCode)
  })
})

import i18n from "i18next"
import { beforeAll, describe, expect, it, vi } from "vitest"

vi.hoisted(() => {
  const g = global as any
  g.__BACKEND_URL__ = "http://localhost:9000"
  g.__AUTH_TYPE__ = "session"
  g.__JWT_TOKEN_STORAGE_KEY__ = ""
})

import * as form from "../create-region-form"

// The app initializes i18next before any form runs; with no resources it answers the key.
beforeAll(async () => {
  await i18n.init({ lng: "es", resources: {} })
})

const messages = () => {
  const schema = (form as any).CreateRegionSchema
  if (!schema) {
    return {}
  }
  const result = schema.safeParse({
    name: "",
    currency_code: "",
    automatic_taxes: true,
    is_tax_inclusive: false,
    countries: [],
    payment_providers: [],
  })
  return Object.fromEntries(
    result.error.issues.map((issue: any) => [issue.path.join("."), issue.message])
  )
}

// Pagly-Core/pagly-app#267: region create said "Enter a name for the region",
// "Select a currency" and "Select at least one payment provider" in English.
describe("region create's messages", () => {
  it("come from the catalogs", () => {
    expect(messages()).toEqual({
      name: "regions.validation.name",
      currency_code: "regions.validation.currency",
      payment_providers: "regions.validation.paymentProviders",
    })
  })
})

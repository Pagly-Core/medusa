import i18n from "i18next"
import { beforeAll, describe, expect, it, vi } from "vitest"

vi.hoisted(() => {
  const g = global as any
  g.__BACKEND_URL__ = "http://localhost:9000"
  g.__AUTH_TYPE__ = "session"
  g.__JWT_TOKEN_STORAGE_KEY__ = ""
})

import { EditRules } from "../../../../common/edit-rules/components/edit-rules-form/form-schema"
import { CreatePromotionSchema } from "../form-schema"

// The app initializes i18next before any form runs; with no resources it answers the key.
beforeAll(async () => {
  await i18n.init({ lng: "es", resources: {} })
})

const emptyRule = { attribute: "", operator: "", values: [] }

const messagesAt = (result: any, prefix: string) =>
  result.success
    ? []
    : result.error.issues
        .filter((issue: any) => issue.path.join(".").startsWith(prefix))
        .map((issue: any) => issue.message)

// Pagly-Core/pagly-app#267: a Buy X get Y's conditions said "Required field"
// beside fields that said "Obligatorio".
describe("a promotion's rule messages", () => {
  it("say required in the admin's words on create", () => {
    const result = CreatePromotionSchema.safeParse({
      application_method: { buy_rules: [emptyRule], target_rules: [], allocation: "each" },
    })
    const messages = messagesAt(result, "application_method.buy_rules.0")
    expect(messages.length).toBeGreaterThan(0)
    expect(new Set(messages)).toEqual(new Set(["promotions.form.required"]))
  })

  it("say required in the admin's words for the max quantity", () => {
    const result = CreatePromotionSchema.safeParse({
      code: "X",
      is_automatic: "false",
      type: "buyget",
      status: "draft",
      rules: [],
      application_method: {
        allocation: "each",
        value: 10,
        target_rules: [],
        buy_rules: [],
        type: "percentage",
        target_type: "items",
      },
    })
    expect(messagesAt(result, "application_method.max_quantity")).toEqual([
      "promotions.form.required",
    ])
  })

  it("read the admin's language when edited rules are checked", () => {
    const result = EditRules.safeParse({
      rules: [emptyRule],
      application_method: { target_type: "items" },
    })
    expect(new Set(messagesAt(result, "rules.0"))).toEqual(
      new Set(["promotions.form.required"])
    )
  })
})

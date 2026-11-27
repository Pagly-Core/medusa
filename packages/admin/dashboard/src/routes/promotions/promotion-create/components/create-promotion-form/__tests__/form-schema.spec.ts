import { describe, expect, it, vi } from "vitest"

vi.hoisted(() => {
  const g = global as any
  g.__BACKEND_URL__ = "http://localhost:9000"
  g.__AUTH_TYPE__ = "session"
  g.__JWT_TOKEN_STORAGE_KEY__ = ""
})

import { CreatePromotionSchema } from "../form-schema"

const promotion = (type: "fixed" | "percentage", value: number) => ({
  template_id: "amount_off_order",
  is_automatic: "false",
  code: "VERANO",
  type: "standard",
  status: "draft",
  rules: [],
  application_method: {
    allocation: "across",
    value,
    currency_code: "uyu",
    target_rules: [],
    buy_rules: [],
    type,
    target_type: "order",
  },
})

const valueIssues = (data: unknown) => {
  const result = CreatePromotionSchema.safeParse(data)
  return result.success
    ? []
    : result.error.issues.filter((issue) => issue.path.join(".") === "application_method.value")
}

// Pagly-Core/pagly-app#356: a 150% promotion was accepted.
describe("a promotion's value", () => {
  it("takes a percentage up to 100", () => {
    expect(valueIssues(promotion("percentage", 100))).toEqual([])
    expect(valueIssues(promotion("percentage", 150))).toHaveLength(1)
  })

  it("takes any fixed amount", () => {
    expect(valueIssues(promotion("fixed", 1500))).toEqual([])
  })
})

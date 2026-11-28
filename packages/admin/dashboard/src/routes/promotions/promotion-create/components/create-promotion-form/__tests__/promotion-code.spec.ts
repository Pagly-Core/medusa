import i18n from "i18next"
import { beforeAll, describe, expect, it, vi } from "vitest"

vi.hoisted(() => {
  const g = global as any
  g.__BACKEND_URL__ = "http://localhost:9000"
  g.__AUTH_TYPE__ = "session"
  g.__JWT_TOKEN_STORAGE_KEY__ = ""
})

import { CreatePromotionSchema } from "../form-schema"

// The app initializes i18next before any form runs; with no resources it answers the key.
beforeAll(async () => {
  await i18n.init({ lng: "es", resources: {} })
})

// Pagly-Core/pagly-app#356: a promotion without a code only turned the field
// red, with no word of what was wrong.
describe("a promotion's code", () => {
  it("is required, in the admin's words", () => {
    const result = CreatePromotionSchema.safeParse({ code: "" })
    const issues = result.success ? [] : result.error.issues.filter((issue) => issue.path.join(".") === "code")

    expect(issues.map((issue) => issue.message)).toEqual(["validation.required"])
  })
})

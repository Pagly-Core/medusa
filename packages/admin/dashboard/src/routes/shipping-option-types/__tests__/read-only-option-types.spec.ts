import { existsSync, readFileSync } from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

/**
 * Pagly: shipping option types are one platform list on the cloud, which a
 * store only reads: creating, editing or deleting one answers "read-only for
 * tenant users" (Pagly-Core/pagly-app#252). The dashboard lists them and shows
 * one, and offers nothing the platform refuses.
 */

const SRC = path.resolve(__dirname, "../../..")
const read = (file: string) => readFileSync(path.join(SRC, file), "utf8")
const LIST = "routes/shipping-option-types/shipping-option-type-list/components/shipping-option-type-list-table"

describe("shipping option types", () => {
  it("have no create or edit page", () => {
    const routes = read("dashboard-app/routes/get-route.map.tsx")
    expect(routes).not.toMatch(/shipping-option-type-create|shipping-option-type-edit/)
    expect(existsSync(path.join(SRC, "routes/shipping-option-types/shipping-option-type-create"))).toBe(false)
    expect(existsSync(path.join(SRC, "routes/shipping-option-types/shipping-option-type-edit"))).toBe(false)
  })

  it.each([
    `${LIST}/shipping-option-type-list-table.tsx`,
    `${LIST}/configurable-shipping-option-type-list-table.tsx`,
  ])("offer no create in %s", (file) => {
    expect(read(file)).not.toMatch(/to[:=]\s*\{?\s*"create"/)
  })

  it.each([
    `${LIST}/shipping-option-type-list-table.tsx`,
    `${LIST}/shipping-option-type-table-adapter.tsx`,
    "routes/shipping-option-types/shipping-option-type-detail/components/shipping-option-type-general-section/shipping-option-type-general-section.tsx",
  ])("offer no edit or delete in %s", (file) => {
    const source = read(file)
    expect(source).not.toMatch(/ShippingOptionTypeRowActions|useDeleteShippingOptionTypeAction/)
    expect(source).not.toMatch(/actions\.(edit|delete)/)
  })
})

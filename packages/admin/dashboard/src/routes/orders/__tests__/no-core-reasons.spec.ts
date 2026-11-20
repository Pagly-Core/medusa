import { existsSync, readFileSync } from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

/**
 * Pagly: core's return and refund reasons are one platform list on the cloud,
 * which a store only reads and can't add to. The reasons a store keeps are its
 * own, in Settings › Returns and exchanges (the plugin), so the dashboard has
 * no page for core's lists and no form asks for one of them.
 */

const SRC = path.resolve(__dirname, "../../..")
const read = (file: string) => readFileSync(path.join(SRC, file), "utf8")

const FORMS = [
  "routes/orders/order-create-return/components/return-create-form/return-item.tsx",
  "routes/orders/order-create-exchange/components/exchange-create-form/exchange-inbound-item.tsx",
  "routes/orders/order-create-claim/components/claim-create-form/claim-inbound-item.tsx",
  "routes/orders/order-create-refund/components/create-refund-form/create-refund-form.tsx",
  "routes/orders/order-balance-settlement/components/order-balance-settlement-form/order-balance-settlement-form.tsx",
]

describe("core's return and refund reasons", () => {
  it.each(FORMS)("are not asked for in %s", (file) => {
    const source = read(file)
    expect(source).not.toMatch(/useReturnReasons|useRefundReasons/)
    expect(source).not.toMatch(/reason_id/)
  })

  it("have no pages", () => {
    const routes = read("dashboard-app/routes/get-route.map.tsx")
    expect(routes).not.toMatch(/return-reasons|refund-reasons/)
    expect(existsSync(path.join(SRC, "routes/return-reasons"))).toBe(false)
    expect(existsSync(path.join(SRC, "routes/refund-reasons"))).toBe(false)
  })

  it("are not found by the search", () => {
    expect(read("lib/search/default-search-entities.ts")).not.toMatch(/return_reason|return-reasons/)
  })

  it("are not listed among the settings pages", () => {
    expect(read("components/layout/settings-layout/settings-layout.tsx")).not.toMatch(
      /return-reasons|refund-reasons/
    )
  })
})

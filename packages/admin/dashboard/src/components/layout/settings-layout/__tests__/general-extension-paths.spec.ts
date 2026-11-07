import { describe, expect, test } from "vitest"

import { GENERAL_EXTENSION_PATHS } from "../general-extension-paths"

/**
 * Pagly: the plugin's settings pages that merchants treat as store setup sit
 * under General, after Store, in this order.
 */
describe("the settings pages under General", () => {
  test("list Payments, Checkout, Customer accounts, Notifications, Domains, then the assistant", () => {
    expect(GENERAL_EXTENSION_PATHS).toEqual([
      "/settings/pagos",
      "/settings/checkout",
      "/settings/customer-accounts",
      "/settings/notifications",
      "/settings/domains",
      "/settings/asistente",
    ])
  })
})

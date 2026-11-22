import { describe, expect, it } from "vitest"

import es from "../../i18n/translations/es.json"
import { getOrderFulfillmentStatus } from "../order-helpers"

const t = ((key: string) => key) as any
const read = (key: string) =>
  key.split(".").reduce<any>((node, part) => node?.[part], es)

// Pagly: the order page header says where an order stands in the merchant's
// words (order page redesign, 2026-11-22).
describe("order status words", () => {
  it("shows an order still to prepare in orange, not as an error", () => {
    expect(getOrderFulfillmentStatus(t, "not_fulfilled")).toEqual({
      label: "orders.fulfillment.status.notFulfilled",
      color: "orange",
    })
  })

  it("says paid and prepared in Spanish, not the fulfillment calques", () => {
    expect(read("orders.payment.status.captured")).toBe("Pagado")
    expect(read("orders.payment.status.partiallyCaptured")).toBe(
      "Pagado en parte"
    )
    expect(read("orders.fulfillment.status.notFulfilled")).toBe("Por preparar")
    expect(read("orders.fulfillment.status.partiallyFulfilled")).toBe(
      "Preparado en parte"
    )
    expect(read("orders.fulfillment.status.fulfilled")).toBe("Preparado")
    expect(read("orders.fulfillment.status.partiallyShipped")).toBe(
      "Enviado en parte"
    )
  })
})

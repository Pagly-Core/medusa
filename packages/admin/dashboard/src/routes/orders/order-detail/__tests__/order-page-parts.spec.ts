import { describe, expect, it } from "vitest"

import { INJECTION_ZONES } from "../../../../../../admin-shared/src/extensions/widgets/constants"
import en from "../../../../i18n/translations/en.json"
import es from "../../../../i18n/translations/es.json"

// Pagly: the places on the order page a plugin part goes (see the order
// page redesign). Each is a registry: a part names its place, the page never
// names a plugin.
const ORDER_PART_ZONES = [
  "order.details.next",
  "order.details.line",
  "order.details.shipping",
  "order.details.payment",
  "order.details.customer",
  "order.details.discount",
]

const NEW_KEYS = [
  "orders.headerMeta",
  "orders.nextStep.prepare.title",
  "orders.nextStep.prepare.detail_one",
  "orders.nextStep.prepare.detail_other",
  "orders.nextStep.prepare.action",
  "orders.nextStep.shipped.title",
  "orders.nextStep.shipped.detail",
  "orders.nextStep.shipped.action",
  "orders.nextStep.unpaid.title",
  "orders.nextStep.unpaid.detail",
  "orders.nextStep.receive.title",
  "orders.nextStep.receive.detail",
  "orders.products.title",
  "orders.lineState.toPrepare",
  "orders.lineState.prepared",
  "orders.lineState.partlyShipped",
  "orders.lineState.shipped",
  "orders.lineState.shippedIn",
  "orders.lineState.delivered",
  "orders.lineState.returnRequested",
  "orders.lineState.returned",
  "orders.summary.subtotal",
  "orders.summary.discount",
  "orders.summary.discountNamed",
  "orders.summary.shipping",
  "orders.summary.total",
  "orders.summary.tax",
  "orders.summary.taxIncluded",
  "orders.summary.paid",
  "orders.summary.pending",
  "orders.summary.toCapture",
  "orders.shipping.title",
  "orders.shipping.method",
  "orders.shipping.recipient",
  "orders.shipping.shipmentOf",
  "orders.payment.manualProvider",
  "orders.customer.billing",
  "orders.customer.billingSameAsShipping",
]

const read = (catalog: Record<string, any>, key: string) =>
  key.split(".").reduce<any>((node, part) => node?.[part], catalog)

describe("order page parts", () => {
  it("lets plugins place parts in the five order page zones", () => {
    for (const zone of ORDER_PART_ZONES) {
      expect(INJECTION_ZONES, zone).toContain(zone)
    }
  })

  it("has every new order page string in English and Spanish", () => {
    for (const key of NEW_KEYS) {
      expect(typeof read(en, key), `en ${key}`).toBe("string")
      expect(typeof read(es, key), `es ${key}`).toBe("string")
    }
  })

  it("says Pagly's words for the states in Spanish", () => {
    expect(read(es, "orders.lineState.toPrepare")).toBe("Por preparar")
    expect(read(es, "orders.products.title")).toBe("Productos")
    expect(read(es, "orders.shipping.title")).toBe("Envío")
    expect(read(es, "orders.payment.manualProvider")).toBe("Pago manual")
  })
})

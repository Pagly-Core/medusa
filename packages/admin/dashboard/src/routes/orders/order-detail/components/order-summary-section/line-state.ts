import { HttpTypes } from "@medusajs/types"

import { ExtendedOrderFulfillment } from "../../constants"

export type LineState = {
  key: string
  color: "orange" | "blue" | "green" | "grey"
  values?: Record<string, number>
}

/**
 * Pagly: where one product line stands, said on the line itself, so the
 * order page lists each product once instead of again in an unfulfilled
 * card and each shipment. A requested return comes first; a canceled order
 * says nothing.
 */
export const getLineState = (
  item: HttpTypes.AdminOrderLineItem,
  order: HttpTypes.AdminOrder
): LineState | null => {
  if (order.status === "canceled") {
    return null
  }

  const detail = item.detail
  const quantity = item.quantity

  if ((detail.return_requested_quantity ?? 0) > 0) {
    return { key: "orders.lineState.returnRequested", color: "orange" }
  }

  if ((detail.return_received_quantity ?? 0) >= quantity) {
    return { key: "orders.lineState.returned", color: "grey" }
  }

  if (detail.delivered_quantity >= quantity) {
    return { key: "orders.lineState.delivered", color: "green" }
  }

  if (detail.shipped_quantity >= quantity) {
    const shipments = (order.fulfillments ?? []).filter(
      (fulfillment) => fulfillment.shipped_at && !fulfillment.canceled_at
    )

    if (shipments.length > 1) {
      const index = shipments.findIndex((fulfillment) =>
        (fulfillment as ExtendedOrderFulfillment).items?.some(
          (line) => line.line_item_id === item.id
        )
      )

      if (index > -1) {
        return {
          key: "orders.lineState.shippedIn",
          color: "green",
          values: { n: index + 1 },
        }
      }
    }

    return { key: "orders.lineState.shipped", color: "green" }
  }

  if (detail.shipped_quantity > 0) {
    return {
      key: "orders.lineState.partlyShipped",
      color: "orange",
      values: { done: detail.shipped_quantity, total: quantity },
    }
  }

  if (detail.fulfilled_quantity >= quantity) {
    return { key: "orders.lineState.prepared", color: "blue" }
  }

  return { key: "orders.lineState.toPrepare", color: "orange" }
}

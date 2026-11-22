import { describe, expect, it } from "vitest"

import { fulfillment, makeOrder, orderItem } from "../../../__fixtures__/order"
import { getLineState } from "../line-state"

const withItem = (detail: Record<string, number>, over: Record<string, unknown> = {}) => {
  const item = orderItem("item_mug", { detail }) as any
  return { item, order: makeOrder({ items: [item], ...over }) }
}

describe("getLineState", () => {
  it("says a line still to send is to prepare", () => {
    const { item, order } = withItem({})
    expect(getLineState(item, order)).toEqual({
      key: "orders.lineState.toPrepare",
      color: "orange",
    })
  })

  it("says a packed line that hasn't left is prepared", () => {
    const { item, order } = withItem({ fulfilled_quantity: 2 })
    expect(getLineState(item, order)).toEqual({
      key: "orders.lineState.prepared",
      color: "blue",
    })
  })

  it("says how many of a line left when only some did", () => {
    const { item, order } = withItem({ fulfilled_quantity: 1, shipped_quantity: 1 })
    expect(getLineState(item, order)).toEqual({
      key: "orders.lineState.partlyShipped",
      color: "orange",
      values: { done: 1, total: 2 },
    })
  })

  it("says a line left, without a number when the order went in one shipment", () => {
    const { item, order } = withItem(
      { fulfilled_quantity: 2, shipped_quantity: 2 },
      {
        fulfillments: [
          fulfillment("ful_1", {
            shipped_at: "2026-11-21T10:00:00.000Z",
            items: [{ line_item_id: "item_mug", quantity: 2 }],
          }),
        ],
      }
    )
    expect(getLineState(item, order)).toEqual({
      key: "orders.lineState.shipped",
      color: "green",
    })
  })

  it("names the shipment a line left in when there are several", () => {
    const { item, order } = withItem(
      { fulfilled_quantity: 2, shipped_quantity: 2 },
      {
        fulfillments: [
          fulfillment("ful_1", {
            shipped_at: "2026-11-21T10:00:00.000Z",
            items: [{ line_item_id: "item_other", quantity: 1 }],
          }),
          fulfillment("ful_2", {
            shipped_at: "2026-11-21T11:00:00.000Z",
            items: [{ line_item_id: "item_mug", quantity: 2 }],
          }),
        ],
      }
    )
    expect(getLineState(item, order)).toEqual({
      key: "orders.lineState.shippedIn",
      color: "green",
      values: { n: 2 },
    })
  })

  it("numbers a line's shipment as Envío does, canceled ones included", () => {
    const { item, order } = withItem(
      { fulfilled_quantity: 2, shipped_quantity: 2 },
      {
        fulfillments: [
          fulfillment("ful_1", {
            canceled_at: "2026-11-21T09:00:00.000Z",
            items: [{ line_item_id: "item_mug", quantity: 2 }],
          }),
          fulfillment("ful_2", {
            shipped_at: "2026-11-21T11:00:00.000Z",
            items: [{ line_item_id: "item_mug", quantity: 2 }],
          }),
        ],
      }
    )
    expect(getLineState(item, order)).toEqual({
      key: "orders.lineState.shippedIn",
      color: "green",
      values: { n: 2 },
    })
  })

  it("says a line that doesn't ship is done once prepared", () => {
    const item = orderItem("item_ebook", { requires_shipping: false, quantity: 1, detail: { fulfilled_quantity: 1 } }) as any
    expect(getLineState(item, makeOrder({ items: [item] }))).toEqual({
      key: "orders.lineState.delivered",
      color: "green",
    })
  })

  it("says a line arrived", () => {
    const { item, order } = withItem({
      fulfilled_quantity: 2,
      shipped_quantity: 2,
      delivered_quantity: 2,
    })
    expect(getLineState(item, order)).toEqual({
      key: "orders.lineState.delivered",
      color: "green",
    })
  })

  it("puts a requested return before where the line is", () => {
    const { item, order } = withItem({
      fulfilled_quantity: 2,
      shipped_quantity: 2,
      delivered_quantity: 2,
      return_requested_quantity: 1,
    })
    expect(getLineState(item, order)).toEqual({
      key: "orders.lineState.returnRequested",
      color: "orange",
    })
  })

  it("says a line came back", () => {
    const { item, order } = withItem({
      fulfilled_quantity: 2,
      shipped_quantity: 2,
      delivered_quantity: 2,
      return_received_quantity: 2,
    })
    expect(getLineState(item, order)).toEqual({
      key: "orders.lineState.returned",
      color: "grey",
    })
  })

  it("says nothing on a canceled order", () => {
    const { item, order } = withItem({}, { status: "canceled" })
    expect(getLineState(item, order)).toBeNull()
  })
})

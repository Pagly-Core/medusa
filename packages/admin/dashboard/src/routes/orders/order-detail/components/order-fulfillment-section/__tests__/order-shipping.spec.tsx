// @vitest-environment jsdom
import { TooltipProvider } from "@medusajs/ui"
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { fulfillment, makeOrder, orderItem } from "../../../__fixtures__/order"
import { OrderFulfillmentSection } from "../order-fulfillment-section"

const zones = vi.hoisted(() => ({ current: {} as Record<string, any[]> }))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key} ${JSON.stringify(values)}` : key,
  }),
}))

vi.mock("../../../../../../providers/extension-provider", () => ({
  useExtension: () => ({
    getWidgets: (zone: string) => zones.current[zone] ?? [],
  }),
}))

vi.mock("../../../../../../hooks/api/orders", () => ({
  useCancelOrderFulfillment: () => ({ mutateAsync: vi.fn() }),
  useMarkOrderFulfillmentAsDelivered: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock("../../../../../../hooks/api/stock-locations", () => ({
  useStockLocation: () => ({
    stock_location: { id: "sloc_1", name: "Depósito Cordón" },
    isError: false,
  }),
}))

beforeEach(() => {
  zones.current = {}
})

afterEach(() => {
  cleanup()
})

const renderShipping = (order = makeOrder()) =>
  render(
    <MemoryRouter>
      <TooltipProvider>
        <OrderFulfillmentSection order={order} />
      </TooltipProvider>
    </MemoryRouter>
  )

const twoShipments = () =>
  makeOrder({
    fulfillment_status: "shipped",
    items: [
      orderItem("item_mug", {
        detail: { fulfilled_quantity: 2, shipped_quantity: 2 },
      }),
      orderItem("item_apron", {
        title: "Delantal de lino",
        quantity: 1,
        detail: { fulfilled_quantity: 1, shipped_quantity: 1 },
      }),
    ],
    fulfillments: [
      fulfillment("ful_1", {
        location_id: "sloc_1",
        shipped_at: "2026-11-21T10:00:00.000Z",
        items: [{ line_item_id: "item_mug", title: "Blanca", quantity: 2 }],
      }),
      fulfillment("ful_2", {
        location_id: "sloc_1",
        shipped_at: "2026-11-21T11:00:00.000Z",
        items: [
          { line_item_id: "item_apron", title: "Arena · M", quantity: 1 },
        ],
      }),
    ],
  })

describe("OrderFulfillmentSection as Envío", () => {
  it("is one card titled Envío", () => {
    renderShipping()
    expect(
      screen.getAllByRole("heading", { name: "orders.shipping.title" })
    ).toHaveLength(1)
  })

  it("says how it ships and where to", () => {
    renderShipping()
    expect(screen.getByText("orders.shipping.method")).toBeTruthy()
    expect(screen.getByText("UES a domicilio")).toBeTruthy()
    expect(screen.getByText("orders.shipping.recipient")).toBeTruthy()
    expect(screen.getByText(/Av\. 18 de Julio 1234/)).toBeTruthy()
  })

  it("doesn't list the products again while nothing has left", () => {
    renderShipping()
    expect(screen.queryByText("orders.fulfillment.unfulfilledItems")).toBeNull()
    expect(screen.queryByText("Taza de cerámica")).toBeNull()
  })

  it("keeps preparing within reach in its menu", () => {
    renderShipping()
    expect(screen.queryByText("orders.fulfillment.awaitingFulfillmentBadge")).toBeNull()
  })

  it("numbers shipments when there are several", () => {
    renderShipping(twoShipments())
    expect(
      screen.getByText('orders.shipping.shipmentOf {"n":1,"total":2}')
    ).toBeTruthy()
    expect(
      screen.getByText('orders.shipping.shipmentOf {"n":2,"total":2}')
    ).toBeTruthy()
  })

  it("doesn't number a single shipment", () => {
    const order = twoShipments()
    order.fulfillments = order.fulfillments.slice(0, 1)
    renderShipping(order)
    expect(screen.queryByText(/orders\.shipping\.shipmentOf/)).toBeNull()
  })

  it("puts plugin shipping parts inside the card, with the order", () => {
    const seen: string[] = []
    const Labels = ({ data }: any) => {
      seen.push(data.id)
      return <div data-testid="carrier-labels" />
    }
    zones.current = { "order.details.shipping": [Labels] }

    renderShipping()

    expect(screen.getByTestId("carrier-labels")).toBeTruthy()
    expect(seen[0]).toBe("order_1")
  })
})

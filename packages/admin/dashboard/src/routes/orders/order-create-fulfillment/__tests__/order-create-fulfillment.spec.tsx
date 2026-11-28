// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { ReactNode } from "react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ order: null as any, shown: [] as boolean[] }))

vi.mock("../../../../components/modals", () => ({
  RouteFocusModal: ({ children }: { children?: ReactNode }) => <>{children}</>,
}))

vi.mock("../../../../hooks/api/orders", () => ({
  useOrder: () => ({ order: mocks.order, isLoading: false, isError: false }),
}))

// What the form is asked to fulfil: the items that need shipping, or the rest.
vi.mock("../components/order-create-fulfillment-form", () => ({
  OrderCreateFulfillmentForm: ({ requiresShipping }: { requiresShipping: boolean }) => {
    mocks.shown.push(requiresShipping)
    return null
  },
}))

import { OrderCreateFulfillment } from "../order-create-fulfillments"

afterEach(() => {
  cleanup()
  mocks.shown = []
})

const item = (requires_shipping: boolean, quantity: number, fulfilled_quantity = 0) => ({
  id: `item_${requires_shipping}_${quantity}`,
  requires_shipping,
  quantity,
  detail: { fulfilled_quantity },
})

const openAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/orders/:id/fulfillment" element={<OrderCreateFulfillment />} />
      </Routes>
    </MemoryRouter>
  )

// Pagly-Core/pagly-app#254: opened by its address, without the menu's
// ?requires_shipping=, the form fulfilled only items that need no shipping,
// so an order of shipped goods showed "no items".
describe("the fulfilment form opened by its address", () => {
  it("fulfils the items that need shipping when some are left", () => {
    mocks.order = { id: "order_1", items: [item(true, 2), item(false, 1)] }

    openAt("/orders/order_1/fulfillment")

    expect(mocks.shown.at(-1)).toBe(true)
  })

  it("fulfils the rest once every shipped item is fulfilled", () => {
    mocks.order = { id: "order_1", items: [item(true, 2, 2), item(false, 1)] }

    openAt("/orders/order_1/fulfillment")

    expect(mocks.shown.at(-1)).toBe(false)
  })

  it("keeps what the address asks for", () => {
    mocks.order = { id: "order_1", items: [item(true, 2), item(false, 1)] }

    openAt("/orders/order_1/fulfillment?requires_shipping=false")

    expect(mocks.shown.at(-1)).toBe(false)
  })
})

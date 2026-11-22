// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { makeOrder } from "../__fixtures__/order"
import { OrderDetail } from "../order-detail"

vi.hoisted(() => {
  const globals = globalThis as Record<string, unknown>
  globals.__BACKEND_URL__ = "http://localhost:9000"
  globals.__AUTH_TYPE__ = "session"
  globals.__JWT_TOKEN_STORAGE_KEY__ = ""
  globals.__STOREFRONT_URL__ = ""
  globals.__BASE__ = "/"
})

vi.mock("react-router-dom", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-router-dom")>()),
  useLoaderData: () => undefined,
  useParams: () => ({ id: "order_1" }),
  Outlet: () => <div data-testid="outlet" />,
}))

vi.mock("../../../../hooks/api/orders", () => ({
  useOrder: () => ({ order: makeOrder(), isLoading: false, isError: false }),
  useOrderPreview: () => ({ order: { id: "order_1" }, isLoading: false }),
}))

vi.mock("../../../../hooks/api/plugins", () => ({
  usePlugins: () => ({ plugins: [] }),
}))

vi.mock("../../../../components/layout-composer", () => ({
  LayoutComposer: () => <div data-testid="layout-composer" />,
  detailPageDefaultEntries: () => null,
}))

const { markerModule } = vi.hoisted(() => ({
  markerModule: (name: string, id: string) => async () => {
    const { createElement } = await import("react")
    return { [name]: () => createElement("div", { "data-testid": id }) }
  },
}))

vi.mock("../components/order-general-section", markerModule("OrderGeneralSection", "header"))
vi.mock("../components/order-next-step", markerModule("OrderNextStep", "next-step"))
vi.mock("../components/order-summary-section", markerModule("OrderSummarySection", "products"))
vi.mock("../components/order-fulfillment-section", markerModule("OrderFulfillmentSection", "shipping"))
vi.mock("../components/order-payment-section", markerModule("OrderPaymentSection", "payment"))
vi.mock("../components/order-customer-section", markerModule("OrderCustomerSection", "customer"))
vi.mock("../components/order-activity-section", markerModule("OrderActivitySection", "activity"))

afterEach(() => {
  cleanup()
})

const order = (ids: string[]) => {
  const all = screen.getAllByTestId(/.+/).map((el) => el.dataset.testid)
  return all.filter((id) => ids.includes(id!))
}

describe("OrderDetail", () => {
  it("lays the order out as the approved design, with no drag-and-drop layout", () => {
    render(<OrderDetail />)

    expect(screen.queryByTestId("layout-composer")).toBeNull()
    expect(
      order(["header", "next-step", "products", "shipping", "payment"])
    ).toEqual(["header", "next-step", "products", "shipping", "payment"])
    expect(order(["customer", "activity"])).toEqual(["customer", "activity"])
  })

  it("puts the side column after the main one, so a phone reads the next step first", () => {
    render(<OrderDetail />)

    const ids = screen.getAllByTestId(/.+/).map((el) => el.dataset.testid)
    expect(ids.indexOf("payment")).toBeLessThan(ids.indexOf("customer"))
  })

  it("keeps the outlet for the order's drawers", () => {
    render(<OrderDetail />)
    expect(screen.getByTestId("outlet")).toBeTruthy()
  })
})

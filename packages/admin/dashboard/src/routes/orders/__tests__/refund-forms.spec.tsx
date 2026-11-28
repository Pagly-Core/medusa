// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

// Radix measures the radio group and select with ResizeObserver, which jsdom lacks.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
} as any
// Radix Select reads pointer capture and scrolls its items into view.
Element.prototype.hasPointerCapture ??= () => false
Element.prototype.releasePointerCapture ??= () => {}
Element.prototype.scrollIntoView ??= () => {}

const mocks = vi.hoisted(() => ({ refund: vi.fn(), creditLine: vi.fn() }))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock("../../../components/modals", async () => {
  const { FormProvider } = await import("react-hook-form")
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>

  return {
    RouteDrawer: Object.assign(Pass, {
      Form: ({ form, children }: { form: any; children?: ReactNode }) => (
        <FormProvider {...form}>{children}</FormProvider>
      ),
      Body: Pass,
      Footer: Pass,
      Close: Pass,
    }),
    useRouteModal: () => ({ handleSuccess: vi.fn() }),
  }
})

vi.mock("../../../hooks/api", () => ({
  useRefundPayment: (_orderId: string, paymentId: string | undefined) => ({
    mutateAsync: (body: unknown) => mocks.refund(paymentId, body),
    isPending: false,
  }),
  useCreateOrderCreditLine: () => ({ mutateAsync: mocks.creditLine, isPending: false }),
}))

import { OrderBalanceSettlementForm } from "../order-balance-settlement"
import { CreateRefundForm } from "../order-create-refund/components/create-refund-form"

afterEach(() => {
  cleanup()
  mocks.refund.mockReset()
  mocks.creditLine.mockReset()
})

const PAYMENT_ID = "pay_01JABCDEFGHIJKLMNOPQRSTUVW"

const order = {
  id: "order_1",
  currency_code: "uyu",
  summary: { pending_difference: -500 },
  customer: { has_account: false },
  payment_collections: [
    {
      payments: [
        { id: PAYMENT_ID, amount: 500, currency_code: "uyu", provider_id: "pp_system_default", refunds: [] },
      ],
    },
  ],
} as any

const renderAt = (element: JSX.Element, search = "") =>
  render(<MemoryRouter initialEntries={[`/orders/order_1/refund${search}`]}>{element}</MemoryRouter>)

const save = () => fireEvent.click(screen.getByRole("button", { name: "actions.save" }))

const typeAmount = (value: string) => {
  const input = screen.getByRole("textbox", { name: "fields.amount" }) as HTMLInputElement
  fireEvent.change(input, { target: { value } })
}

// Pagly-Core/pagly-app#255: Guardar with no payment chosen sent
// POST /admin/payments/undefined/refund, and the only feedback was the
// server's English toast.
describe.each([
  ["the refund form", (search?: string) => renderAt(<CreateRefundForm order={order} />, search)],
  ["the balance settlement form", (search?: string) => renderAt(<OrderBalanceSettlementForm order={order} />, search)],
])("%s", (_, open) => {
  it("asks for the payment, and sends nothing, when none is chosen", async () => {
    open()
    typeAmount("100")

    save()

    expect(await screen.findByText("orders.payment.selectPaymentRequired")).toBeTruthy()
    expect(mocks.refund).not.toHaveBeenCalled()
  })

  it("asks for an amount above zero, and sends nothing, when it is empty or zero", async () => {
    open(`?paymentId=${PAYMENT_ID}`)
    typeAmount("0")

    save()

    expect(await screen.findByText("orders.payment.refundAmountRequired")).toBeTruthy()
    expect(mocks.refund).not.toHaveBeenCalled()
  })

  // The issue's own steps: Guardar with nothing chosen, then a payment.
  it("refunds a payment chosen after a first Guardar with nothing chosen, at the amount it brings", async () => {
    open()

    save()
    expect(await screen.findByText("orders.payment.selectPaymentRequired")).toBeTruthy()

    fireEvent.keyDown(screen.getByRole("combobox"), { key: "Enter" })
    fireEvent.click(await screen.findByRole("option"))
    // The payment brings what is left to refund: nothing to type.
    // Guardar comes back once the form has nothing left to fix.
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "actions.save" }).hasAttribute("disabled")).toBe(false)
    )
    save()

    await waitFor(() => expect(mocks.refund).toHaveBeenCalledTimes(1))
    expect(mocks.refund.mock.calls[0][0]).toBe(PAYMENT_ID)
  })

  it("refunds the chosen payment", async () => {
    open(`?paymentId=${PAYMENT_ID}`)
    typeAmount("100")

    save()

    await waitFor(() => expect(mocks.refund).toHaveBeenCalledTimes(1))
    expect(mocks.refund.mock.calls[0][0]).toBe(PAYMENT_ID)
    expect(mocks.refund.mock.calls[0][1]).toEqual(expect.objectContaining({ amount: 100 }))
  })
})

// Pagly: an address naming a payment the order doesn't have (a stale or
// edited link) crashed the drawer on `payment!.amount`. It offers the
// order's payments instead (review of Pagly-Core/medusa#89).
describe("the refund form opened for a payment the order doesn't have", () => {
  it("offers the order's payments and sends nothing until one is chosen", async () => {
    renderAt(<CreateRefundForm order={order} />, "?paymentId=pay_not_this_orders")
    typeAmount("100")

    save()

    expect(await screen.findByText("orders.payment.selectPaymentRequired")).toBeTruthy()
    expect(mocks.refund).not.toHaveBeenCalled()
  })
})

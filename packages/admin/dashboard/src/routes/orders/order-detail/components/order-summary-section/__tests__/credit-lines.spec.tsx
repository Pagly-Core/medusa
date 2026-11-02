// @vitest-environment jsdom
import { TooltipProvider } from "@medusajs/ui"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { OrderSummarySection } from "../order-summary-section"

const fetch = vi.hoisted(() => vi.fn())

vi.mock("../../../../../../lib/client", () => ({
  sdk: { client: { fetch } },
}))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en" },
  }),
}))

vi.mock("../../../../../../hooks/api/reservations", () => ({
  useReservationItems: () => ({ reservations: [] }),
}))

vi.mock("../../../../../../hooks/api/orders", () => ({
  useOrderPreview: () => ({ order: undefined }),
}))

vi.mock("../../../../../../hooks/api/returns", () => ({
  useReturns: () => ({ returns: [] }),
}))

vi.mock("../../../../../../hooks/api/claims", () => ({
  useClaims: () => ({ claims: [] }),
}))

vi.mock("../../../../../../hooks/api/exchanges", () => ({
  useExchanges: () => ({ exchanges: [] }),
}))

vi.mock("../../../../../../hooks/api/payment-collections", () => ({
  useMarkPaymentCollectionAsPaid: () => ({ mutateAsync: vi.fn() }),
}))

vi.mock("../../../../../../hooks/use-date", () => ({
  useDate: () => ({ getRelativeDate: () => "", getFullDate: () => "" }),
}))

const creditLine = (
  id: string,
  reference: string,
  amount: number,
  metadata: Record<string, unknown> | null = null
) => ({
  id,
  reference,
  reference_id: `${reference}_ref`,
  amount,
  metadata,
  created_at: "2026-11-02T12:00:00.000Z",
})

// Pagly: an order paid partly with a gift card and with store credit, plus
// money given back as store credit and a credit line from somewhere else.
const order = {
  id: "order_1",
  status: "pending",
  display_id: 1,
  currency_code: "usd",
  payment_collections: [],
  credit_lines: [
    creditLine("cl_gift_01K9AAAA", "gift-card", 500, { code_last4: "7KQ2" }),
    creditLine("cl_saldo_01K9BBBB", "store-credit", 200, {}),
    creditLine("cl_refund_01K9CCCC", "refund", -150),
    creditLine("cl_other_01K9DDDD", "loyalty-points", 50),
  ],
  summary: { pending_difference: 0 },
  items: [],
  shipping_methods: [],
  item_total: 1000,
  item_subtotal: 1000,
  item_tax_total: 0,
  item_discount_total: 0,
  shipping_total: 0,
  shipping_subtotal: 0,
  shipping_tax_total: 0,
  shipping_discount_total: 0,
  discount_total: 0,
  tax_total: 0,
  original_total: 1000,
  total: 400,
  credit_line_total: 600,
  paid_total: 0,
  refunded_total: 0,
}

const renderSummary = (plugins: { name: string }[] = []) =>
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <MemoryRouter>
        <TooltipProvider>
          <OrderSummarySection order={order as any} plugins={plugins as any} />
        </TooltipProvider>
      </MemoryRouter>
    </QueryClientProvider>
  )

beforeEach(() => {
  fetch.mockReset()
  fetch.mockResolvedValue({ discounts: [] })
})

afterEach(() => {
  cleanup()
})

describe("the order's gift cards and store credit", () => {
  it("names each credit line by what paid it", () => {
    renderSummary()
    fireEvent.click(screen.getByText("orders.creditLines.title"))

    const rows = screen
      .getAllByTestId("order-credit-line-row")
      .map((row) => row.textContent)

    expect(rows).toEqual([
      expect.stringMatching(/^orders\.creditLines\.kinds\.giftCard•••• 7KQ2.*500/),
      expect.stringMatching(/^orders\.creditLines\.kinds\.storeCredit.*200/),
      expect.stringMatching(/^orders\.creditLines\.kinds\.refund.*150/),
      // a reference no kind knows keeps upstream's prettified reference
      expect.stringMatching(/\(loyalty points\).*50/),
    ])
  })

  it("never shows a known credit line's internal ID", () => {
    const { container } = renderSummary()
    fireEvent.click(screen.getByText("orders.creditLines.title"))

    // upstream shows each line as its short ID (`#` and the last 7 characters)
    for (const line of order.credit_lines.slice(0, 3)) {
      expect(container.textContent).not.toContain(`#${line.id.slice(-7)}`)
    }
  })

  it("names a gift card line without its last four when the line has none", () => {
    const withoutTail = {
      ...order,
      credit_lines: [creditLine("cl_gift_01K9EEEE", "gift-card", 500, {})],
    }

    render(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>
          <TooltipProvider>
            <OrderSummarySection order={withoutTail as any} plugins={[]} />
          </TooltipProvider>
        </MemoryRouter>
      </QueryClientProvider>
    )
    fireEvent.click(screen.getByText("orders.creditLines.title"))

    const [row] = screen.getAllByTestId("order-credit-line-row")
    expect(row.textContent).toMatch(/^orders\.creditLines\.kinds\.giftCard\D*500/)
    expect(row.textContent).not.toContain("••••")
  })

  it("titles the group for gift cards and store credit when the loyalty plugin is on", () => {
    renderSummary([{ name: "@medusajs/loyalty-plugin" }])

    expect(screen.getByText("orders.giftCardsStoreCreditLines")).toBeTruthy()
  })
})

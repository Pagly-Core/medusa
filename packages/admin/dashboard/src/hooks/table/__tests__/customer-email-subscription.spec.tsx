// @vitest-environment jsdom
import { cleanup, render, renderHook, screen } from "@testing-library/react"
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { PropsWithChildren } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

import en from "../../../i18n/translations/en.json"
import es from "../../../i18n/translations/es.json"
import { useCustomerTableColumns } from "../columns/use-customer-table-columns"
import { useCustomerTableFilters } from "../filters/use-customer-table-filters"
import { useCustomerTableQuery } from "../query/use-customer-table-query"

/**
 * Pagly: the customers list shows and filters on each customer's email
 * marketing consent, which @pagly/storefront keeps in
 * `metadata.email_marketing`, like Shopify's "Email subscription" column.
 */

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock("../../api/customer-groups", () => ({
  useCustomerGroups: () => ({
    customer_groups: [{ id: "cusgroup_vip", name: "VIP" }],
  }),
}))

afterEach(() => {
  cleanup()
})

const consent = (state: "subscribed" | "unsubscribed") => ({
  state,
  opt_in_level: "single_opt_in",
  consent_updated_at: "2026-11-02T10:00:00.000Z",
  source: "newsletter",
})

const customers = [
  {
    id: "cus_subscribed",
    email: "ana@example.com",
    metadata: { email_marketing: consent("subscribed") },
  },
  {
    id: "cus_unsubscribed",
    email: "bruno@example.com",
    metadata: { email_marketing: consent("unsubscribed") },
  },
  { id: "cus_never_asked", email: "carla@example.com", metadata: null },
  {
    id: "cus_other_metadata",
    email: "diego@example.com",
    metadata: { vip: true },
  },
  {
    id: "cus_unreadable",
    email: "eva@example.com",
    metadata: { email_marketing: "yes" },
  },
]

const CustomersTable = () => {
  const columns = useCustomerTableColumns()
  const table = useReactTable({
    data: customers as any[],
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <table>
      <thead>
        <tr>
          {table.getFlatHeaders().map((header) => (
            <th key={header.id} data-testid={`header:${header.column.id}`}>
              {flexRender(header.column.columnDef.header, header.getContext())}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row
              .getVisibleCells()
              .filter((cell) => cell.column.id === "email_subscription")
              .map((cell) => (
                <td key={cell.id} data-testid={`${row.original.id}:email`}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const columnIds = () =>
  screen
    .getAllByRole("columnheader")
    .map((header) => header.dataset.testid?.replace("header:", ""))

describe("customers list email subscription column", () => {
  it("sits after the account column", () => {
    render(<CustomersTable />)

    expect(columnIds()).toEqual([
      "email",
      "name",
      "has_account",
      "email_subscription",
      "created_at",
    ])
    expect(screen.getByTestId("header:email_subscription").textContent).toBe(
      "customers.emailSubscription.label"
    )
  })

  it("says subscribed only for a subscribed consent", () => {
    render(<CustomersTable />)

    expect(screen.getByTestId("cus_subscribed:email").textContent).toBe(
      "customers.emailSubscription.subscribed"
    )

    for (const id of [
      "cus_unsubscribed",
      "cus_never_asked",
      "cus_other_metadata",
      "cus_unreadable",
    ]) {
      expect(screen.getByTestId(`${id}:email`).textContent).toBe(
        "customers.emailSubscription.notSubscribed"
      )
    }
  })

  it("marks subscribed green and not subscribed grey, like the account column", () => {
    render(<CustomersTable />)

    const dot = (id: string) =>
      screen
        .getByTestId(`${id}:email`)
        .querySelector("[role=presentation] > div")

    expect(dot("cus_subscribed")?.className).toContain("bg-ui-tag-green-icon")
    expect(dot("cus_never_asked")?.className).toContain(
      "bg-ui-tag-neutral-icon"
    )
  })
})

describe("customers list email subscription filter", () => {
  const emailFilter = {
    key: "email_subscribed",
    label: "customers.emailSubscription.label",
    type: "select",
    options: [
      { label: "customers.emailSubscription.subscribed", value: "true" },
      { label: "customers.emailSubscription.notSubscribed", value: "false" },
    ],
  }

  it("offers subscribed and not subscribed, after the account filter", () => {
    const { result } = renderHook(() => useCustomerTableFilters())

    expect(result.current.map((filter) => filter.key)).toEqual([
      "groups",
      "has_account",
      "email_subscribed",
      "created_at",
      "updated_at",
    ])
    expect(
      result.current.find((filter) => filter.key === "email_subscribed")
    ).toEqual(emailFilter)
  })

  it("is offered on a customer group's list too", () => {
    const { result } = renderHook(() => useCustomerTableFilters(["groups"]))

    expect(
      result.current.find((filter) => filter.key === "email_subscribed")
    ).toEqual(emailFilter)
  })
})

describe("customers list email subscription query", () => {
  const queryAt = (url: string) =>
    renderHook(() => useCustomerTableQuery({ pageSize: 20 }), {
      wrapper: ({ children }: PropsWithChildren) => (
        <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
      ),
    }).result.current

  it("asks for subscribed customers", () => {
    const { searchParams, raw } = queryAt("/customers?email_subscribed=true")

    expect(searchParams.email_subscribed).toBe(true)
    expect(raw.email_subscribed).toBe("true")
  })

  it("asks for customers who are not subscribed", () => {
    expect(
      queryAt("/customers?email_subscribed=false").searchParams.email_subscribed
    ).toBe(false)
  })

  it("asks for everyone without the filter", () => {
    expect(queryAt("/customers").searchParams.email_subscribed).toBeUndefined()
  })
})

describe("customers list email subscription copy", () => {
  it("is labels only, in English and in Spanish", () => {
    expect((en.customers as any).emailSubscription).toEqual({
      label: "Email subscription",
      subscribed: "Subscribed",
      notSubscribed: "Not subscribed",
    })
    expect((es.customers as any).emailSubscription).toEqual({
      label: "Suscripción por email",
      subscribed: "Con suscripción",
      notSubscribed: "Sin suscripción",
    })
  })
})

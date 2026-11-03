// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { PropsWithChildren, ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

import { AddCustomersForm } from "../components/add-customers-form"

/**
 * Pagly: the add customers table shares the customers list's columns, so it
 * shows the Email subscription column, which reads `metadata.email_marketing`.
 */

const { ana } = vi.hoisted(() => ({
  ana: {
    id: "cus_ana",
    email: "ana@example.com",
    first_name: "Ana",
    last_name: "Suárez",
    has_account: true,
    groups: [],
    metadata: { email_marketing: { state: "subscribed" } },
    created_at: "2026-11-02T10:00:00.000Z",
  },
}))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock("../../../../components/modals", async () => {
  const { FormProvider } = await import("react-hook-form")
  const Pass = ({ children }: { children?: ReactNode }) => <>{children}</>

  return {
    RouteFocusModal: Object.assign(Pass, {
      Form: ({ form, children }: { form: any; children?: ReactNode }) => (
        <FormProvider {...form}>{children}</FormProvider>
      ),
      Header: Pass,
      Body: Pass,
      Footer: Pass,
      Close: Pass,
    }),
    useRouteModal: () => ({ handleSuccess: vi.fn() }),
  }
})

// Each row's email subscription cell, as the table renders it.
vi.mock("../../../../components/table/data-table", async () => {
  const { flexRender } = await import("@tanstack/react-table")

  return {
    _DataTable: ({ table }: { table: any }) => (
      <table>
        <tbody>
          {table.getRowModel().rows.map((row: any) => (
            <tr key={row.id}>
              {row
                .getVisibleCells()
                .filter((cell: any) => cell.column.id === "email_subscription")
                .map((cell: any) => (
                  <td key={cell.id} data-testid={`${row.id}:email`}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
            </tr>
          ))}
        </tbody>
      </table>
    ),
  }
})

vi.mock("../../../../hooks/api/customer-groups", () => ({
  useCustomerGroups: () => ({ customer_groups: [] }),
  useAddCustomersToGroup: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

// The API answers a fields list without +/- modifiers with those fields only
// (field-parser.ts), so a field the list leaves out never reaches the table.
vi.mock("../../../../hooks/api/customers", () => ({
  useCustomers: ({ fields }: { fields: string }) => {
    const named = fields.split(",").map((field) => field.replace(/^[*+]/, ""))
    const customer = Object.fromEntries(
      Object.entries(ana).filter(([key]) => key === "id" || named.includes(key))
    )

    return { customers: [customer], count: 1, isLoading: false }
  },
}))

afterEach(() => {
  cleanup()
})

describe("add customers to a group", () => {
  it("shows a subscribed customer as subscribed", () => {
    render(<AddCustomersForm customerGroupId="cusgroup_vip" />, {
      wrapper: ({ children }: PropsWithChildren) => (
        <MemoryRouter
          initialEntries={["/customer-groups/cusgroup_vip/add-customers"]}
        >
          {children}
        </MemoryRouter>
      ),
    })

    expect(screen.getByTestId("cus_ana:email").textContent).toBe(
      "customers.emailSubscription.subscribed"
    )
  })
})

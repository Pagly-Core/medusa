// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"

import { useOrderTableQuery } from "../use-order-table-query"

const searchFor = (q: string) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[`/orders?q=${encodeURIComponent(q)}`]}>
      {children}
    </MemoryRouter>
  )
  return renderHook(() => useOrderTableQuery({}), { wrapper }).result.current
    .searchParams.q
}

// Pagly-Core/pagly-app#267: searching orders for "#8", as the admin writes an
// order's number, found nothing; "8" did.
describe("searching orders", () => {
  it("finds an order by its number written with a #", () => {
    expect(searchFor("#8")).toBe("8")
    expect(searchFor(" #1001 ")).toBe("1001")
  })

  it("leaves any other search as it is", () => {
    expect(searchFor("ana@example.com")).toBe("ana@example.com")
    expect(searchFor("#rojo")).toBe("#rojo")
  })
})

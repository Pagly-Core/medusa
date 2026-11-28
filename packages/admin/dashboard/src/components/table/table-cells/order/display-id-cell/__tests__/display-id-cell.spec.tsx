// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { DisplayIdCell } from "../display-id-cell"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

afterEach(() => {
  cleanup()
})

// Pagly: an order's cell shows the store's own number (custom_display_id, from 1001), as every order
// page does; Medusa's display_id is shared by every store.
describe("DisplayIdCell", () => {
  it("shows the store's own number", () => {
    render(<DisplayIdCell displayId={4562} customDisplayId="1001" />)

    expect(screen.getByText("#1001")).toBeTruthy()
    expect(screen.queryByText("#4562")).toBeNull()
  })

  it("shows the shared number when the order has none of its own", () => {
    render(<DisplayIdCell displayId={1042} />)

    expect(screen.getByText("#1042")).toBeTruthy()
  })
})

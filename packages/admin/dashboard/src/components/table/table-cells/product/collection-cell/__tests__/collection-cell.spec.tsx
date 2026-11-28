// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { CollectionCell } from "../collection-cell"

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

afterEach(() => {
  cleanup()
})

// Pagly: the Colección column names every collection a product is in
// (Pagly-Core/pagly-app#258).
describe("CollectionCell", () => {
  it("names every collection the product is in", () => {
    render(
      <CollectionCell
        collections={[
          { id: "pcol_1", title: "Verano" },
          { id: "pcol_2", title: "Ofertas" },
        ]}
      />
    )

    expect(screen.getByText("Verano, Ofertas")).toBeTruthy()
  })

  it("shows the placeholder for a product in no collection", () => {
    const { container } = render(<CollectionCell collections={[]} />)

    expect(container.textContent).toBe("-")
  })
})

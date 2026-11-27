// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { PaglyLogo } from "../pagly-logo"

afterEach(cleanup)

/**
 * Pagly: the logo names itself where it stands alone, and stays out of the
 * way of assistive tech beside a name that already says what the control is.
 */
describe("the Pagly logo", () => {
  it("is an image named Pagly when it stands alone", () => {
    render(<PaglyLogo />)
    expect(screen.getByRole("img", { name: "Pagly" })).toBeTruthy()
  })

  it("is hidden from assistive tech when decorative", () => {
    const { container } = render(<PaglyLogo decorative />)
    expect(screen.queryByRole("img")).toBeNull()
    const logo = container.querySelector("[data-pagly-logo]")
    expect(logo).toBeTruthy()
    expect(logo?.getAttribute("aria-hidden")).toBe("true")
  })
})

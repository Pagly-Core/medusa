// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key} ${JSON.stringify(values)}` : key,
  }),
}))

import { MediaAltInput } from "../media-alt-input"

afterEach(cleanup)

describe("MediaAltInput", () => {
  it("is a labelled single line capped at 125 characters", () => {
    render(<MediaAltInput value="" onChange={() => {}} />)

    const input = screen.getByRole("textbox", {
      name: "products.media.altLabel",
    })

    expect(input.getAttribute("placeholder")).toBe("products.media.altLabel")
    expect(input.getAttribute("maxlength")).toBe("125")
  })

  it("shows the value and hands back what is typed", () => {
    const onChange = vi.fn()
    render(<MediaAltInput value="Taza roja" onChange={onChange} />)

    const input = screen.getByRole("textbox") as HTMLInputElement
    expect(input.value).toBe("Taza roja")

    fireEvent.change(input, { target: { value: "Taza roja de cerámica" } })

    expect(onChange).toHaveBeenCalledWith("Taza roja de cerámica")
  })

  it("treats an unfilled value as empty", () => {
    render(<MediaAltInput value={undefined} onChange={() => {}} />)

    expect((screen.getByRole("textbox") as HTMLInputElement).value).toBe("")
  })

  it("says how much is left only from 100 characters", () => {
    const { rerender } = render(
      <MediaAltInput value={"a".repeat(99)} onChange={() => {}} />
    )

    expect(screen.queryByText(/\/125/)).toBeNull()

    rerender(<MediaAltInput value={"a".repeat(110)} onChange={() => {}} />)

    expect(screen.getByText("110/125")).toBeTruthy()
  })
})

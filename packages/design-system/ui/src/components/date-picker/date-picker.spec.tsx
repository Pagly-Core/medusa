import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import * as React from "react"
import { I18nProvider } from "react-aria"
import { vi } from "vitest"

import { DatePicker } from "./date-picker"

const renderPicker = (
  locale: string,
  props: Partial<React.ComponentProps<typeof DatePicker>> = {}
) => {
  const onChange = vi.fn()
  render(
    <I18nProvider locale={locale}>
      <DatePicker
        granularity="minute"
        aria-label="Starts"
        onChange={onChange}
        {...props}
      />
      <button type="button">Elsewhere</button>
    </I18nProvider>
  )
  return onChange
}

/** Types 15 December 2026 into the date segments, in the locale's order. */
const typeDate = async (user: ReturnType<typeof userEvent.setup>) => {
  const segments = screen.getAllByRole("spinbutton")
  await user.click(segments[0])
  const order = segments
    .slice(0, 3)
    .map((segment) => segment.getAttribute("aria-label") ?? "")
  for (const label of order) {
    const lower = label.toLowerCase()
    const text =
      lower.startsWith("month") || lower.startsWith("mes")
        ? "12"
        : lower.startsWith("day") || lower.startsWith("día")
          ? "15"
          : "2026"
    await user.keyboard(text)
  }
}

// Pagly-Core/pagly-app#261: a date typed by hand, with no time, was never
// committed (react-stately waits for every segment), so the form kept null.
describe("DatePicker with a time", () => {
  it.each(["es-AR", "en-US"])(
    "commits a typed date with no time once focus leaves it, in %s",
    async (locale) => {
      const user = userEvent.setup()
      const onChange = renderPicker(locale)

      await typeDate(user)
      await user.click(screen.getByRole("button", { name: "Elsewhere" }))

      await waitFor(() => expect(onChange).toHaveBeenCalled())
      const value: Date = onChange.mock.calls.at(-1)![0]
      expect([value.getFullYear(), value.getMonth(), value.getDate()]).toEqual([
        2026, 11, 15,
      ])
      expect([value.getHours(), value.getMinutes()]).toEqual([0, 0])
    }
  )

  it("gives a typed date the time of placeholderValue", async () => {
    const user = userEvent.setup()
    const onChange = renderPicker("es-AR", {
      placeholderValue: new Date(2026, 0, 1, 23, 59),
    })

    await typeDate(user)
    await user.click(screen.getByRole("button", { name: "Elsewhere" }))

    await waitFor(() => expect(onChange).toHaveBeenCalled())
    const value: Date = onChange.mock.calls.at(-1)![0]
    expect([value.getDate(), value.getHours(), value.getMinutes()]).toEqual([
      15, 23, 59,
    ])
  })

  it("gives a picked day the time of placeholderValue", async () => {
    const user = userEvent.setup()
    const onChange = renderPicker("es-AR", {
      placeholderValue: new Date(2026, 0, 1, 23, 59),
    })

    // The calendar button is the first button in the group.
    await user.click(screen.getAllByRole("button")[0])
    await screen.findByRole("grid")
    await user.click((await screen.findAllByRole("button", { name: /15/ }))[0])

    await waitFor(() => expect(onChange).toHaveBeenCalled())
    const value: Date = onChange.mock.calls.at(-1)![0]
    expect([value.getDate(), value.getHours(), value.getMinutes()]).toEqual([
      15, 23, 59,
    ])
  })

  it("leaves a half-typed date alone", async () => {
    const user = userEvent.setup()
    const onChange = renderPicker("es-AR")

    const [first] = screen.getAllByRole("spinbutton")
    await user.click(first)
    await user.keyboard("15")
    await user.click(screen.getByRole("button", { name: "Elsewhere" }))

    expect(onChange).not.toHaveBeenCalled()
  })
})

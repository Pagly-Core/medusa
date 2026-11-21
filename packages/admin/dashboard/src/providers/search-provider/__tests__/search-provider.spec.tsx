// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("../../../components/search", () => ({ Search: () => null }))
vi.mock("../../sidebar-provider", () => ({
  useSidebar: () => ({ mobile: false, toggle: () => {} }),
}))

import { SearchProvider } from "../search-provider"
import { searchShortcutLabel } from "../search-shortcut"

afterEach(cleanup)

const press = (init: KeyboardEventInit) => {
  const event = new KeyboardEvent("keydown", { cancelable: true, ...init })
  document.dispatchEvent(event)
  return event
}

describe("search shortcut", () => {
  it("keeps Ctrl+K from the browser, so Chrome's own search never opens", () => {
    render(<SearchProvider>{null}</SearchProvider>)

    expect(press({ key: "k", ctrlKey: true }).defaultPrevented).toBe(true)
    expect(press({ key: "k", metaKey: true }).defaultPrevented).toBe(true)
  })

  it("leaves a plain k and other shortcuts alone", () => {
    render(<SearchProvider>{null}</SearchProvider>)

    expect(press({ key: "k" }).defaultPrevented).toBe(false)
    expect(press({ key: "c", ctrlKey: true }).defaultPrevented).toBe(false)
  })

  it("names the key the way each computer writes it", () => {
    expect(searchShortcutLabel("MacIntel")).toBe("⌘K")
    expect(searchShortcutLabel("iPad")).toBe("⌘K")
    expect(searchShortcutLabel("Win32")).toBe("Ctrl K")
    expect(searchShortcutLabel("Linux x86_64")).toBe("Ctrl K")
    expect(searchShortcutLabel("")).toBe("Ctrl K")
  })
})

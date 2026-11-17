// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import { FetchError } from "@medusajs/js-sdk"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"
import { useState } from "react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  clear: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock("@medusajs/ui", () => ({ toast: { error: mocks.toastError } }))

vi.mock("../../lib/client", () => ({ sdk: { auth: { logout: mocks.logout } } }))
vi.mock("../../lib/query-client", () => ({ queryClient: { clear: mocks.clear } }))

import { useSignOut } from "../use-sign-out"

/** A menu item: it goes away as soon as it is clicked, as a dropdown's does. */
const Item = ({ onPicked }: { onPicked: () => void }) => {
  const signOut = useSignOut()

  return (
    <button
      type="button"
      onClick={() => {
        void signOut()
        onPicked()
      }}
    >
      sign out
    </button>
  )
}

const Menu = () => {
  const [open, setOpen] = useState(true)

  return open ? <Item onPicked={() => setOpen(false)} /> : <p>menu closed</p>
}

const renderMenu = () => {
  const router = createMemoryRouter(
    [
      { path: "/products", element: <Menu /> },
      { path: "/login", element: <p>login page</p> },
    ],
    { initialEntries: ["/products"] }
  )
  render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )

  return router
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("signing out", () => {
  it("leaves for the login page when the answer comes after the menu closed", async () => {
    let answer: () => void = () => {}
    mocks.logout.mockReturnValue(new Promise<void>((resolve) => (answer = resolve)))
    const router = renderMenu()

    await act(async () => screen.getByRole("button", { name: "sign out" }).click())

    // The item is gone and the session is still being ended.
    expect(screen.getByText("menu closed")).toBeTruthy()
    expect(router.state.location.pathname).toBe("/products")

    await act(async () => answer())

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(mocks.clear).toHaveBeenCalledTimes(1)
  })

  it("leaves at once when the answer is immediate", async () => {
    mocks.logout.mockResolvedValue(undefined)
    const router = renderMenu()

    await act(async () => screen.getByRole("button", { name: "sign out" }).click())

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(mocks.clear).toHaveBeenCalledTimes(1)
  })

  it("stays, with what was read, and says why when the session could not be ended", async () => {
    mocks.logout.mockRejectedValue(new Error("Failed to fetch"))
    const router = renderMenu()

    await act(async () => screen.getByRole("button", { name: "sign out" }).click())

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalledWith("Failed to fetch"))
    expect(router.state.location.pathname).toBe("/products")
    expect(mocks.clear).not.toHaveBeenCalled()
  })

  it("leaves for the login page when the session had already ended", async () => {
    mocks.logout.mockRejectedValue(new FetchError("Unauthorized", "Unauthorized", 401))
    const router = renderMenu()

    await act(async () => screen.getByRole("button", { name: "sign out" }).click())

    await waitFor(() => expect(router.state.location.pathname).toBe("/login"))
    expect(mocks.clear).toHaveBeenCalledTimes(1)
    expect(mocks.toastError).not.toHaveBeenCalled()
  })
})

const SRC = path.resolve(__dirname, "../..")

/** Every source file, read side by side: the dashboard has a few thousand. */
const sources = async (dir: string): Promise<string[]> => {
  const entries = await readdir(dir, { withFileTypes: true })
  const found = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        return entry.name === "__tests__" ? [] : sources(full)
      }
      return /\.tsx?$/.test(entry.name) ? [full] : []
    })
  )
  return found.flat()
}

describe("every way out of the admin", () => {
  it("signs out through useSignOut, never with its own redirect", async () => {
    const files = await sources(SRC)
    // The hook by any name it is imported or passed under, and the call it wraps.
    const SIGNS_OUT = /\buseLogout\b|\bauth\s*\.\s*logout\b/
    const texts = await Promise.all(files.map((file) => readFile(file, "utf8")))
    const own = files
      .filter((_, index) => SIGNS_OUT.test(texts[index]))
      .map((file) => path.relative(SRC, file).split(path.sep).join("/"))
      .sort()

    expect(files.length).toBeGreaterThan(100)
    expect(own).toEqual(["hooks/api/auth.tsx", "hooks/use-sign-out.tsx"])
  }, 60_000)
})

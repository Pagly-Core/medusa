// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, cleanup, render, screen, waitFor } from "@testing-library/react"
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { useState } from "react"
import { createMemoryRouter, RouterProvider } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  clear: vi.fn(),
}))

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
        // A refused sign-out is the caller's to report; here it is only awaited.
        signOut().catch(() => {})
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

  it("stays, with what was read, when the session could not be ended", async () => {
    mocks.logout.mockRejectedValue(new Error("offline"))
    const router = renderMenu()

    await act(async () => screen.getByRole("button", { name: "sign out" }).click())
    await waitFor(() => expect(mocks.logout).toHaveBeenCalled())

    expect(router.state.location.pathname).toBe("/products")
    expect(mocks.clear).not.toHaveBeenCalled()
  })
})

const SRC = path.resolve(__dirname, "../..")

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name)
    if (statSync(full).isDirectory()) {
      return name === "__tests__" ? [] : sources(full)
    }
    return /\.tsx?$/.test(name) ? [full] : []
  })

describe("every way out of the admin", () => {
  it("signs out through useSignOut, never with its own redirect", () => {
    const own = sources(SRC)
      .filter((file) => /\buseLogout\(/.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(SRC, file).split(path.sep).join("/"))
      .sort()

    expect(own).toEqual(["hooks/use-sign-out.tsx"])
    // Reads every source file of the dashboard.
  }, 60_000)
})

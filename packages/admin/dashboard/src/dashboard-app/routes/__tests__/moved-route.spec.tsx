// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom"
import { afterEach, describe, expect, test } from "vitest"

import { MovedRoute, movedPath } from "../moved-route"

afterEach(cleanup)

describe("movedPath", () => {
  const types = (pathname: string, search = "") =>
    movedPath(pathname, search, "/settings/product-types", "/product-types")

  test("moves the list", () => {
    expect(types("/settings/product-types")).toBe("/product-types")
  })

  test("keeps what followed the old prefix", () => {
    expect(types("/settings/product-types/ptyp_01")).toBe(
      "/product-types/ptyp_01"
    )
    expect(types("/settings/product-types/ptyp_01/metadata/edit")).toBe(
      "/product-types/ptyp_01/metadata/edit"
    )
  })

  test("keeps the query", () => {
    expect(types("/settings/product-types", "?q=remera&offset=20")).toBe(
      "/product-types?q=remera&offset=20"
    )
  })
})

describe("MovedRoute", () => {
  const Where = () => {
    const location = useLocation()
    return <p>{location.pathname + location.search}</p>
  }

  test("sends an old link to where its page moved", () => {
    render(
      <MemoryRouter
        initialEntries={["/settings/product-tags/ptag_01/edit?x=1"]}
      >
        <Routes>
          <Route
            path="/settings/product-tags/*"
            element={
              <MovedRoute from="/settings/product-tags" to="/product-tags" />
            }
          />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    )
    expect(screen.getByText("/product-tags/ptag_01/edit?x=1")).toBeTruthy()
  })
})

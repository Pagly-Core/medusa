// @vitest-environment jsdom
import { renderHook } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

import { useCoreRoutes } from "../core-routes"

const routes = () => renderHook(() => useCoreRoutes()).result.current

describe("core sidebar routes", () => {
  it("lists price lists under Products, not as a main entry", () => {
    const all = routes()

    expect(all.map((route) => route.to)).not.toContain("/price-lists")

    const products = all.find((route) => route.to === "/products")
    expect(products?.items?.map((item) => item.to)).toEqual([
      "/collections",
      "/categories",
      "/price-lists",
    ])
    expect(products?.items?.at(-1)?.label).toBe("priceLists.domain")
  })
})

import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

import { orderNumber } from "../order-number"

// Pagly: each store numbers its own orders from 1001, in `custom_display_id` (the tenancy trigger,
// pagly-admin-app#266). Medusa's `display_id` is one counter shared by every store on the backend, so
// cocoteo's first order read #103. The admin shows an order by the store's own number.
describe("orderNumber", () => {
  it("reads a store's own number as #1001", () => {
    expect(orderNumber({ display_id: 4562, custom_display_id: "1001" })).toBe("#1001")
    expect(orderNumber({ display_id: 4562, custom_display_id: " 1001 " })).toBe("#1001")
  })

  it("keeps a custom id that is not a bare number as it is", () => {
    expect(orderNumber({ display_id: 4562, custom_display_id: "COCOTEO-1001" })).toBe("COCOTEO-1001")
  })

  it("reads the shared number when the order has none of its own", () => {
    expect(orderNumber({ display_id: 1042, custom_display_id: null })).toBe("#1042")
    expect(orderNumber({ display_id: 1042 })).toBe("#1042")
  })

  it("is nothing without a number", () => {
    expect(orderNumber({})).toBeNull()
    expect(orderNumber(null)).toBeNull()
  })
})

// Every place the admin shows an order's number goes through orderNumber: a page that prints
// display_id itself would show the shared number beside pages that show the store's.
describe("the admin's order numbers", () => {
  const root = path.resolve(__dirname, "../..")
  const sources = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name)
      if (statSync(full).isDirectory()) {
        return name === "__tests__" || name === "__fixtures__" ? [] : sources(full)
      }
      return /\.tsx?$/.test(name) && !/\.(spec|test)\.tsx?$/.test(name) ? [full] : []
    })
  const PRINTS = [/#\$\{[^}]*display_id\}/, /#\{[^}]*display_id\}/, /displayId=\{[^}]*display_id/]

  // orderNumber itself is the one place that reads display_id as a number.
  const HELPER = path.join(root, "lib", "order-number.ts")

  it("prints no display_id of its own", () => {
    const printing = sources(root).filter((file) => file !== HELPER).flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .flatMap((line, index) =>
          PRINTS.some((pattern) => pattern.test(line)) && !line.trim().startsWith("//")
            ? [`${path.relative(root, file).split(path.sep).join("/")}:${index + 1}`]
            : []
        )
    )

    expect(printing).toEqual([])
  }, 30_000)
})

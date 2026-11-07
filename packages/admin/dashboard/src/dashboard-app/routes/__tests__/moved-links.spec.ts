import fs from "fs"
import path from "path"
import { describe, expect, test } from "vitest"

/**
 * Pagly: product types and tags moved out of Settings into Products ›
 * Organization. Old links still redirect (the route map holds those), but no
 * screen should link to the old place.
 */
const SRC = path.join(__dirname, "..", "..", "..")
const OLD_PATHS = ["/settings/product-types", "/settings/product-tags"]
const ALLOWED = [path.join("dashboard-app", "routes", "get-route.map.tsx")]

const sourceFiles = (dir: string): string[] =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return entry.name === "__tests__" || entry.name === "i18n"
        ? []
        : sourceFiles(full)
    }
    return /\.(ts|tsx)$/.test(entry.name) ? [full] : []
  })

describe("links to moved pages", () => {
  test("point at Products › Organization, not at Settings", () => {
    const stale = sourceFiles(SRC)
      .filter((file) => !ALLOWED.includes(path.relative(SRC, file)))
      .flatMap((file) => {
        const text = fs.readFileSync(file, "utf8")
        return OLD_PATHS.filter((old) => text.includes(old)).map(
          (old) => `${path.relative(SRC, file)}: ${old}`
        )
      })
    expect(stale).toEqual([])
  })

  test("the route map sends the old URLs to the new ones", () => {
    const map = fs.readFileSync(
      path.join(SRC, "dashboard-app", "routes", "get-route.map.tsx"),
      "utf8"
    )
    expect(map).toContain(
      '<MovedRoute from="/settings/product-types" to="/product-types" />'
    )
    expect(map).toContain(
      '<MovedRoute from="/settings/product-tags" to="/product-tags" />'
    )
  })
})

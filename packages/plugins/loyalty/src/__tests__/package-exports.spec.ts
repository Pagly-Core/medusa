import path from "path"
import { readFileSync } from "fs"

const packageJson = JSON.parse(
  readFileSync(path.join(__dirname, "../../package.json"), "utf-8")
)

// Pagly: the plugin's own admin (English, flat "Gift Cards" and "Store
// Credits" menu items after Price lists) is replaced by Pagly's screens, so the
// package must not expose an admin entry for the dashboard to load. An upstream
// merge that brings `./admin` back fails here.
describe("@medusajs/loyalty-plugin package exports", () => {
  it("ships no admin extension", () => {
    expect(packageJson.exports).not.toHaveProperty(["./admin"])
  })

  it("still ships the server side the app registers", () => {
    expect(packageJson.exports).toEqual(
      expect.objectContaining({
        "./workflows": expect.anything(),
        "./types": expect.anything(),
        "./.medusa/server/src/modules/loyalty": expect.any(String),
        "./.medusa/server/src/modules/store-credit": expect.any(String),
      })
    )
  })
})

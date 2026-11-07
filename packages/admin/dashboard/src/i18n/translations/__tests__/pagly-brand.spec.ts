import { readdirSync, readFileSync } from "fs"
import { join, relative } from "path"
import ts from "typescript"
import { describe, expect, test } from "vitest"

import { getProductImportCsvTemplate } from "../../../routes/products/product-import/helpers/import-template"

/**
 * Pagly: merchants know the product as Pagly. Medusa is the engine under it
 * and never shows up in admin copy, links or sample files.
 */

function flatten(value: unknown, prefix = ""): [string, string][] {
  if (typeof value === "string") {
    return [[prefix, value]]
  }
  if (!value || typeof value !== "object") {
    return []
  }
  return Object.entries(value).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key)
  )
}

/**
 * Medusa in any script or declension: "Medusu", "Meduse", "Medusában",
 * "Медуза", "مدوسا"…
 */
const MEDUSA =
  /medus|медуз|медус|μέδουσ|μεδουσ|מדוז|מדוס|مدوس|ميدوس|メデュ|メドゥ|美杜莎|梅杜莎|메두사|เมดูซ|เมดูส|medúz|medüz/i

const dir = join(__dirname, "..")
const src = join(dir, "../..")
const locales = readdirSync(dir).filter(
  (file) => file.endsWith(".json") && file !== "$schema.json"
)

/**
 * Whether a piece of source text names Medusa where someone could read it.
 * Package names (`@medusajs/loyalty-plugin`, `[@medusajs/dashboard]` in a
 * console warning) and snake_case storage keys (`medusa_admin_theme`) are
 * code, not copy.
 */
const namesMedusa = (text: string) =>
  /medusa/i.test(
    text
      .replace(/@medusajs\/[\w./-]+/g, "")
      .replace(/\bmedusa_[a-z0-9_]+\b/g, "")
  )

const sourceFiles = (folder: string): string[] =>
  readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    const file = join(folder, entry.name)

    if (entry.isDirectory()) {
      return entry.name === "__tests__" ? [] : sourceFiles(file)
    }
    return /\.tsx?$/.test(entry.name) &&
      !/\.(spec|test)\.tsx?$/.test(entry.name) &&
      !entry.name.endsWith(".d.ts")
      ? [file]
      : []
  })

/** Every string, template and JSX text in a file that names Medusa, as file:line. */
function literalsNamingMedusa(file: string) {
  const source = ts.createSourceFile(
    file,
    readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  )
  const found: string[] = []

  const visit = (node: ts.Node) => {
    // Module specifiers (`@medusajs/ui`, `virtual:medusa/routes`) are code.
    if (
      ts.isImportDeclaration(node) ||
      ts.isExportDeclaration(node) ||
      ts.isImportTypeNode(node) ||
      (ts.isCallExpression(node) &&
        node.expression.kind === ts.SyntaxKind.ImportKeyword)
    ) {
      return
    }
    if (
      (ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateLiteralToken(node) ||
        ts.isJsxText(node)) &&
      namesMedusa(node.text)
    ) {
      const { line } = source.getLineAndCharacterOfPosition(node.getStart())

      found.push(`${relative(src, file).replace(/\\/g, "/")}:${line + 1}`)
    }
    ts.forEachChild(node, visit)
  }

  visit(source)
  return found
}

describe("Pagly brand in admin copy", () => {
  test.each(locales)("%s never says Medusa", (file) => {
    const json = JSON.parse(readFileSync(join(dir, file), "utf8"))
    const offenders = flatten(json)
      .filter(([, value]) => MEDUSA.test(value))
      .map(([key]) => key)

    expect(offenders).toEqual([])
  })

  test("the cloud login says Pagly", () => {
    const en = JSON.parse(readFileSync(join(dir, "en.json"), "utf8"))
    const es = JSON.parse(readFileSync(join(dir, "es.json"), "utf8"))

    expect(en.auth.login.cloud).toBe("Log in with Pagly Cloud")
    expect(es.auth.login.cloud).toBe("Iniciar sesión con Pagly Cloud")
  })

  test("the login screen welcomes merchants to Pagly", () => {
    const en = JSON.parse(readFileSync(join(dir, "en.json"), "utf8"))
    const es = JSON.parse(readFileSync(join(dir, "es.json"), "utf8"))

    expect(en.login.title).toBe("Welcome to Pagly")
    expect(es.login.title).toBe("Bienvenido a Pagly")
  })

  test("the HTML shell is titled Pagly", () => {
    const html = readFileSync(join(dir, "../../../index.html"), "utf8")

    expect(html).toContain("<title>Pagly</title>")
  })

  test("tells copy from code", () => {
    expect(namesMedusa("https://docs.medusajs.com")).toBe(true)
    expect(namesMedusa("medusa-recovery-codes.txt")).toBe(true)
    expect(namesMedusa("Medusa Coffee Mug")).toBe(true)
    expect(namesMedusa("[@medusajs/dashboard] Menu item for path")).toBe(false)
    expect(namesMedusa("@medusajs/framework/utils")).toBe(false)
    expect(namesMedusa("medusa_admin_theme")).toBe(false)
  })

  // Links, file names and sample data are copy too, wherever they live.
  test("no string in the dashboard's source names Medusa", () => {
    const files = sourceFiles(src)

    expect(files.length).toBeGreaterThan(100)
    expect(files.flatMap(literalsNamingMedusa)).toEqual([])
  })

  test("the user menu's dropped items leave no keys behind", () => {
    const schema = readFileSync(join(dir, "$schema.json"), "utf8")
    const leftovers = locales.filter((file) => {
      const user = JSON.parse(readFileSync(join(dir, file), "utf8")).app?.menus
        ?.user

      return user && ("documentation" in user || "changelog" in user)
    })

    expect(leftovers).toEqual([])
    expect(schema).not.toMatch(/"documentation"|"changelog"/)
  })

  test("the user menu keeps profile, theme and logout", () => {
    const menu = readFileSync(
      join(src, "components/layout/user-menu/user-menu.tsx"),
      "utf8"
    )

    expect(menu).not.toContain("app.menus.user.documentation")
    expect(menu).not.toContain("app.menus.user.changelog")
    expect(menu).toContain("app.menus.user.profileSettings")
    expect(menu).not.toContain("app.menus.user.shortcuts")
    expect(menu).toContain("<ThemeToggle />")
    expect(menu).toContain("<Logout />")
  })

  test("the import template is a Pagly sample with the upstream columns", () => {
    const csv = decodeURI(getProductImportCsvTemplate()).replace(
      "data:text/csv;charset=utf-8,",
      ""
    )
    const [header, ...rows] = csv.split("\n")

    expect(csv).not.toMatch(/medusa/i)
    expect(header.split(",")).toHaveLength(42)
    expect(header.startsWith("Product Id,Product Handle,Product Title")).toBe(
      true
    )
    expect(rows.length).toBeGreaterThanOrEqual(2)
    expect(rows.map((row) => row.split(",")[2])).toContain("Ceramic Coffee Mug")
    // A store's own `coffee-mug` would make the unedited template fail to import.
    expect(rows.map((row) => row.split(",")[1])).toEqual(
      expect.arrayContaining(["sample-coffee-mug", "sample-sweatpants"])
    )
    expect(rows.every((row) => row.split(",")[1].startsWith("sample-"))).toBe(
      true
    )
  })
})

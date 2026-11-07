import { describe, expect, test } from "vitest"

import type { INavItem } from "../../nav-item"
import {
  filterSettingsSections,
  groupSettingsRoutes,
  SETTINGS_NAV_GROUPS,
} from "../settings-nav-groups"

/** Labels read back as their keys, so the spec sees which key each entry uses. */
const t = (key: string) => key

/** Every route the settings sidebar is handed today, core then plugin. */
const core = (to: string, label: string): INavItem => ({ to, label })
const plugin = (to: string, label: string): INavItem => ({
  to,
  label,
  type: "extension",
})

const ALL_ROUTES: INavItem[] = [
  core("/settings/store", "store.domain"),
  core("/settings/users", "users.domain"),
  core("/settings/regions", "regions.domain"),
  core("/settings/tax-regions", "taxRegions.domain"),
  core("/settings/return-reasons", "returnReasons.domain"),
  core("/settings/refund-reasons", "refundReasons.domain"),
  core("/settings/sales-channels", "salesChannels.domain"),
  core("/settings/locations", "stockLocations.domain"),
  core("/settings/publishable-api-keys", "apiKeyManagement.domain.publishable"),
  core("/settings/secret-api-keys", "apiKeyManagement.domain.secret"),
  core("/settings/workflows", "workflowExecutions.domain"),
  core("/settings/search", "searchIndexes.domain"),
  plugin("/settings/pagos", "Pagos"),
  plugin("/settings/checkout", "Checkout"),
  plugin("/settings/customer-accounts", "Cuentas de clientes"),
  plugin("/settings/notifications", "Notificaciones"),
  plugin("/settings/domains", "Dominios"),
  plugin("/settings/asistente", "Asistente IA"),
]

const outline = (routes: INavItem[]) =>
  groupSettingsRoutes(routes, t).map((section) => ({
    id: section.id,
    label: section.label,
    collapsed: section.collapsed,
    items: section.items.map((item) => [item.label, item.to]),
  }))

describe("the settings sidebar's groups", () => {
  test("are Store, Selling, Customers and Advanced, with every page in its place", () => {
    expect(outline(ALL_ROUTES)).toEqual([
      {
        id: "store",
        label: "app.nav.settings.store",
        collapsed: false,
        items: [
          ["app.nav.settings.storeGeneral", "/settings/store"],
          ["users.domain", "/settings/users"],
          ["Dominios", "/settings/domains"],
          ["Asistente IA", "/settings/asistente"],
        ],
      },
      {
        id: "sell",
        label: "app.nav.settings.sell",
        collapsed: false,
        items: [
          ["Pagos", "/settings/pagos"],
          ["Checkout", "/settings/checkout"],
          ["app.nav.settings.shipping", "/settings/locations"],
          ["regions.domain", "/settings/regions"],
          ["taxRegions.domain", "/settings/tax-regions"],
          ["salesChannels.domain", "/settings/sales-channels"],
        ],
      },
      {
        id: "customers",
        label: "app.nav.settings.customers",
        collapsed: false,
        items: [
          ["Cuentas de clientes", "/settings/customer-accounts"],
          ["Notificaciones", "/settings/notifications"],
          ["app.nav.tabs.returns", "/settings/return-reasons"],
        ],
      },
      {
        id: "advanced",
        label: "app.nav.settings.advanced",
        collapsed: true,
        items: [
          ["app.nav.tabs.apiKeys", "/settings/publishable-api-keys"],
          ["workflowExecutions.domain", "/settings/workflows"],
          ["searchIndexes.domain", "/settings/search"],
        ],
      },
    ])
  })

  test("give refund reasons and secret keys no entry: they are tabs", () => {
    const routes = groupSettingsRoutes(ALL_ROUTES, t).flatMap((s) =>
      s.items.map((i) => i.to)
    )
    expect(routes).not.toContain("/settings/refund-reasons")
    expect(routes).not.toContain("/settings/secret-api-keys")
  })

  test("keep each entry's type, so plugin pages still render as plugin links", () => {
    const pagos = groupSettingsRoutes(ALL_ROUTES, t)
      .flatMap((s) => s.items)
      .find((i) => i.to === "/settings/pagos")
    expect(pagos?.type).toBe("extension")
  })

  test("put a plugin page no group lists under Extensions, last", () => {
    const sections = outline([
      ...ALL_ROUTES,
      plugin("/settings/loyalty", "Fidelización"),
    ])
    expect(sections.at(-1)).toEqual({
      id: "extensions",
      label: "app.nav.common.extensions",
      collapsed: false,
      items: [["Fidelización", "/settings/loyalty"]],
    })
  })

  test("leave out pages that are not available and groups left empty", () => {
    const sections = outline([
      core("/settings/store", "store.domain"),
      core("/settings/workflows", "workflowExecutions.domain"),
    ])
    expect(sections.map((s) => [s.id, s.items.length])).toEqual([
      ["store", 1],
      ["advanced", 1],
    ])
  })

  test("place roles, policies, translations and property labels when their flags turn them on", () => {
    const sections = outline([
      core("/settings/users", "users.domain"),
      core("/settings/roles", "roles.domain"),
      core("/settings/policies", "policies.domain"),
      core("/settings/translations", "translations.domain"),
      core("/settings/property-labels", "propertyLabels.domain"),
    ])
    expect(sections.map((s) => [s.id, s.items.map((i) => i[1])])).toEqual([
      [
        "store",
        [
          "/settings/users",
          "/settings/roles",
          "/settings/policies",
          "/settings/translations",
        ],
      ],
      ["advanced", ["/settings/property-labels"]],
    ])
  })

  test("list no page twice across groups", () => {
    const routes = SETTINGS_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.to))
    expect(new Set(routes).size).toBe(routes.length)
  })

  test("never list a page that is a tab of another entry", () => {
    const routes = SETTINGS_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.to))
    expect(routes).not.toContain("/settings/refund-reasons")
    expect(routes).not.toContain("/settings/secret-api-keys")
  })

  test("no longer list the profile: it lives in the user menu", () => {
    const routes = SETTINGS_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.to))
    expect(routes).not.toContain("/settings/profile")
  })
})

describe("searching the settings", () => {
  const SPANISH: Record<string, string> = {
    "app.nav.settings.storeGeneral": "General",
    "users.domain": "Usuarios",
    "app.nav.settings.shipping": "Envíos",
    "regions.domain": "Regiones",
    "taxRegions.domain": "Impuestos",
    "salesChannels.domain": "Canales de venta",
    "app.nav.tabs.returns": "Devoluciones",
    "app.nav.tabs.returnReasons": "Motivos de devolución",
    "app.nav.tabs.refundReasons": "Motivos de reembolso",
    "app.nav.tabs.apiKeys": "Claves API",
    "app.nav.tabs.publishable": "Publicables",
    "app.nav.tabs.secret": "Secretas",
    "workflowExecutions.domain": "Flujos de trabajo",
    "searchIndexes.domain": "Búsqueda",
  }
  const es = (key: string) => SPANISH[key] ?? key
  // The sidebar is handed core labels already translated.
  const routes = ALL_ROUTES.map((route) => ({
    ...route,
    label: es(route.label),
  }))
  const search = (query: string) =>
    filterSettingsSections(groupSettingsRoutes(routes, es), query, es).map(
      (item) => item.to
    )

  test("matches entry labels, ignoring case and accents", () => {
    expect(search("envios")).toEqual(["/settings/locations"])
    expect(search("PAGOS")).toEqual(["/settings/pagos"])
  })

  test("finds an entry by one of its tabs", () => {
    expect(search("reembolso")).toEqual(["/settings/return-reasons"])
    expect(search("secretas")).toEqual(["/settings/publishable-api-keys"])
  })

  test("searches the folded Advanced group too", () => {
    expect(search("flujos")).toEqual(["/settings/workflows"])
  })

  test("matches words anywhere in the label, in sidebar order", () => {
    expect(search("de")).toEqual([
      "/settings/sales-channels",
      "/settings/customer-accounts",
      "/settings/return-reasons",
      "/settings/workflows",
    ])
  })

  test("returns nothing for a blank query", () => {
    expect(search("   ")).toEqual([])
  })
})

describe("plugin store setup pages", () => {
  test("put electronic invoicing in Selling, after taxes", () => {
    const sell = groupSettingsRoutes(
      [
        core("/settings/tax-regions", "taxRegions.domain"),
        core("/settings/sales-channels", "salesChannels.domain"),
        plugin("/settings/facturacion-electronica", "einvoicing.domain"),
      ],
      t
    ).find((section) => section.id === "sell")
    expect(sell?.items.map((item) => item.to)).toEqual([
      "/settings/tax-regions",
      "/settings/facturacion-electronica",
      "/settings/sales-channels",
    ])
  })
})

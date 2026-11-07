import { describe, expect, test } from "vitest"

import en from "../en.json"
import es from "../es.json"

/**
 * Pagly: the labels of the regrouped settings sidebar and the section tabs.
 * Labels only, sentence case.
 */
const pick = (json: any) => ({
  settings: {
    store: json.app.nav.settings.store,
    sell: json.app.nav.settings.sell,
    customers: json.app.nav.settings.customers,
    advanced: json.app.nav.settings.advanced,
    search: json.app.nav.settings.search,
    storeGeneral: json.app.nav.settings.storeGeneral,
    shipping: json.app.nav.settings.shipping,
  },
  tabs: json.app.nav.tabs,
  regions: json.regions.domain,
  taxRegions: json.taxRegions.domain,
  returnReasons: json.returnReasons.domain,
})

describe("the settings navigation copy", () => {
  test("in Spanish", () => {
    expect(pick(es)).toEqual({
      settings: {
        store: "Tienda",
        sell: "Vender",
        customers: "Clientes",
        advanced: "Avanzado",
        search: "Buscar",
        storeGeneral: "General",
        shipping: "Envíos",
      },
      tabs: {
        organization: "Organización",
        types: "Tipos",
        tags: "Etiquetas",
        returns: "Devoluciones",
        returnReasons: "Motivos de devolución",
        refundReasons: "Motivos de reembolso",
        apiKeys: "Claves API",
        publishable: "Publicables",
        secret: "Secretas",
      },
      regions: "Mercados",
      taxRegions: "Impuestos",
      returnReasons: "Motivos de devolución",
    })
  })

  test("in English", () => {
    expect(pick(en)).toEqual({
      settings: {
        store: "Store",
        sell: "Selling",
        customers: "Customers",
        advanced: "Advanced",
        search: "Search",
        storeGeneral: "General",
        shipping: "Shipping",
      },
      tabs: {
        organization: "Organization",
        types: "Types",
        tags: "Tags",
        returns: "Returns",
        returnReasons: "Return reasons",
        refundReasons: "Refund reasons",
        apiKeys: "API keys",
        publishable: "Publishable",
        secret: "Secret",
      },
      regions: "Markets",
      taxRegions: "Taxes",
      returnReasons: "Return reasons",
    })
  })
})

describe("return reasons in Spanish", () => {
  const strings = (value: unknown, prefix = ""): [string, string][] =>
    typeof value === "string"
      ? [[prefix, value]]
      : Object.entries(value as object).flatMap(([key, child]) =>
          strings(child, prefix ? `${prefix}.${key}` : key)
        )

  test("are motivos everywhere, never razones, like the page title", () => {
    const razones = [
      ...strings(es.returnReasons, "returnReasons"),
      ["permissions.resources.return_reason", es.permissions.resources.return_reason],
    ].filter(([, value]) => /raz[oó]n/i.test(value))
    expect(razones).toEqual([])
  })
})

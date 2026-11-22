import { describe, expect, test } from "vitest"

import es from "../es.json"

/**
 * Pagly: the admin speaks Rioplatense Spanish. It addresses the merchant as
 * "vos" ("Agregá", "Podés") and writes labels in sentence case ("Listas de
 * precios"), not in English title case ("Listas de Precios").
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

/** Copy only: interpolations ("{{sales_channel}}") and tags ("<0>") are code. */
const strings = flatten(es)
  .filter(([key]) => key !== "$schema")
  .map(([key, value]) => [
    key,
    value.replace(/\{\{[^}]*\}\}|\{[^}]*\}|<\/?\w+>/g, "_"),
  ]) as [string, string][]

/** "tú" and "usted" forms that read differently with "vos". */
const TU_ANYWHERE = new RegExp(
  "(?<!\\p{L})(" +
    [
      "puedes",
      "tienes",
      "debes",
      "quieres",
      "necesitas",
      "deseas",
      "sales",
      "eres",
      "sabes",
      "haces",
      "prefieres",
      "vendes",
      "cobras",
      "buscas",
      "ti",
      "contigo",
      "elimínalos",
      "agrégala",
      "agrégalas",
      "cámbiala",
      "cópiala",
      "guárdala",
      "déjalo",
      "agréguelos",
      "tenga",
      "reconstruyelos",
    ].join("|") +
    ")(?!\\p{L})",
  "iu"
)

/** "tú" imperatives, read where a sentence or a "por favor" starts. */
const TU_IMPERATIVES = [
  "activa",
  "actualiza",
  "agrega",
  "añade",
  "anula",
  "aplica",
  "arrastra",
  "asegúrate",
  "asocia",
  "busca",
  "cambia",
  "comienza",
  "comparte",
  "compra",
  "completa",
  "configura",
  "confirma",
  "conecta",
  "consulta",
  "contacta",
  "copia",
  "corrige",
  "crea",
  "define",
  "deja",
  "descarga",
  "descarta",
  "edita",
  "elige",
  "elimina",
  "empieza",
  "envía",
  "escanea",
  "escribe",
  "espera",
  "especifica",
  "establece",
  "exporta",
  "gestiona",
  "guarda",
  "haz",
  "importa",
  "ingresa",
  "inicia",
  "intenta",
  "introduce",
  "invita",
  "notifica",
  "organiza",
  "personaliza",
  "programa",
  "proporciona",
  "quita",
  "recuerda",
  "registra",
  "revisa",
  "salta",
  "selecciona",
  "sube",
  "suelta",
  "ten",
  "termina",
  "usa",
  "utiliza",
  "verifica",
  "visualiza",
]

const TU_IMPERATIVE = new RegExp(
  "(?:^|[.!?¿¡:\\-–]\\s+|por favor,?\\s+)(" +
    TU_IMPERATIVES.join("|") +
    ")(?!\\p{L})\\s+\\S",
  "iu"
)

/** Names the admin capitalizes inside a sentence. */
const PROPER_NOUNS = ["Pagly Cloud", "Pagly"]

/**
 * Capitalized words a sentence keeps on purpose: example option values, and
 * the names of other screens, tabs and menus as they read on screen.
 */
const KEPT_CAPITALS: Record<string, string[]> = {
  "products.create.variants.optionValues.placeholder": ["Mediano", "Grande"],
  "products.fields.options.variantionsPlaceholder": ["Azul", "Verde"],
  "promotions.bank.notice.description": ["Promociones"],
  "promotions.offer.notice.description": ["Ofertas"],
  "promotions.campaign_currency.tooltip": ["Detalles"],
  "promotions.errors.promotionTabError": ["Promoción"],
  // medusa#30's one-version note names the Manage menu.
  "products.options.oneVersion": ["Gestionar"],
  // The product page's offer note links to the Ofertas screen.
  "products.page.variants.seeOffers": ["Ofertas"],
}

/** A capitalized word that follows another word, not a sentence's end. */
const MID_SENTENCE_CAPITAL =
  /(?<=[^\s.:!?¿¡\-–]\s+)([A-ZÁÉÍÓÚÑ][a-záéíóúüñ]+)/gu

const titleCaseWords = (key: string, value: string) => {
  const text = PROPER_NOUNS.reduce(
    (acc, name) => acc.split(name).join("medusa"),
    value
  )
  const kept = KEPT_CAPITALS[key] ?? []

  return [...text.matchAll(MID_SENTENCE_CAPITAL)]
    .map((match) => match[1])
    .filter((word) => !kept.includes(word))
}

describe("es.json", () => {
  test("speaks to the merchant as vos", () => {
    const tu = strings
      .filter(
        ([, value]) => TU_ANYWHERE.test(value) || TU_IMPERATIVE.test(value)
      )
      .map(([key, value]) => `${key}: ${value}`)

    expect(tu).toEqual([])
  })

  test("writes labels and sentences in sentence case", () => {
    const titleCase = strings
      .map(([key, value]) => [key, value, titleCaseWords(key, value)] as const)
      .filter(([, , words]) => words.length > 0)
      .map(([key, value]) => `${key}: ${value}`)

    expect(titleCase).toEqual([])
  })

  test("names the screens in sentence case", () => {
    expect(es.priceLists.domain).toBe("Listas de precios")
    expect(es.draftOrders.domain).toBe("Pedidos borrador")
    expect(es.customerGroups.domain).toBe("Grupos de clientes")
    expect(es.salesChannels.domain).toBe("Canales de venta")
  })

  test("says talle, as the product options hint does", () => {
    expect(es.productOptions.fields.title.placeholder).toBe("Talle")
  })

  test("names every promotion allocation in Spanish", () => {
    expect(es.promotions.form.allocation.once.title).toBe("Una vez")
    expect(es.promotions.fields.allocationTooltip).not.toMatch(
      /\b(Each|Once)\b/
    )
  })
})

import { describe, expect, it } from "vitest"

import { INJECTION_ZONES } from "../../../../../../admin-shared/src/extensions/widgets/constants"
import en from "../../../../i18n/translations/en.json"
import es from "../../../../i18n/translations/es.json"

// Pagly: the places on the product page a plugin part goes (see the product
// page redesign). Each is a registry: a part names its place, the page never
// names a plugin.
export const PRODUCT_PART_ZONES = [
  "product.details.header",
  "product.details.where",
  "product.details.organization",
  "product.details.shipping",
  "product.details.selling",
  "product.details.main",
  "product.details.side",
]

const NEW_KEYS = [
  "products.page.summary.range",
  "products.page.summary.variants_one",
  "products.page.summary.variants_other",
  "products.page.summary.stock",
  "products.page.summary.stockPlaces",
  "products.page.header.unpublish",
  "products.page.header.more",
  "products.page.blockers.title",
  "products.page.blockers.count_one",
  "products.page.blockers.count_other",
  "products.page.blockers.noPrice.title",
  "products.page.blockers.noPrice.detail_one",
  "products.page.blockers.noPrice.detail_other",
  "products.page.blockers.noPrice.action",
  "products.page.blockers.noPhotos.title",
  "products.page.blockers.noPhotos.detail",
  "products.page.blockers.noPhotos.action",
  "products.page.blockers.noStock.title",
  "products.page.blockers.noStock.detail",
  "products.page.blockers.noStock.action",
  "products.page.blockers.someOut.title_one",
  "products.page.blockers.someOut.title_other",
  "products.page.blockers.someOut.detail_one",
  "products.page.blockers.someOut.detail_other",
  "products.page.blockers.someOut.action",
  "products.page.blockers.draft.title",
  "products.page.blockers.draft.detail",
  "products.page.blockers.draft.action",
  "products.page.blockers.noChannel.title",
  "products.page.blockers.noChannel.detail",
  "products.page.blockers.noChannel.action",
  "products.page.photos.title",
  "products.page.photos.main",
  "products.page.photos.add",
  "products.page.photos.empty.title",
  "products.page.photos.empty.detail",
  "products.page.photos.empty.action",
  "products.page.photos.more",
  "products.page.variants.title",
  "products.page.variants.titleOne",
  "products.page.variants.columns.variant",
  "products.page.variants.columns.sku",
  "products.page.variants.columns.price",
  "products.page.variants.columns.stock",
  "products.page.variants.editPrices",
  "products.page.variants.editPrice",
  "products.page.variants.addVariant",
  "products.page.variants.editOptions",
  "products.page.variants.noPrice",
  "products.page.variants.inStock",
  "products.page.variants.outOfStock",
  "products.page.variants.someOut",
  "products.page.variants.untracked",
  "products.page.variants.backorder",
  "products.page.variants.groupCount_one",
  "products.page.variants.groupCount_other",
  "products.page.variants.sale",
  "products.page.variants.saleUntil",
  "products.page.variants.seeOffers",
  "products.page.variants.price",
  "products.page.variants.stock",
  "products.page.variants.sku",
  "products.page.variants.variants",
  "products.page.variants.oneVersionHint",
  "products.page.variants.addOptions",
  "products.page.variants.more",
  "products.page.description.title",
  "products.page.description.edit",
  "products.page.description.empty",
  "products.page.where.title",
  "products.page.where.store",
  "products.page.where.notInStore",
  "products.page.where.channels",
  "products.page.where.more",
  "products.page.organization.title",
  "products.page.organization.edit",
  "products.page.organization.empty",
  "products.page.organization.category",
  "products.page.shipping.title",
  "products.page.shipping.edit",
  "products.page.shipping.weight",
  "products.page.shipping.sizes",
  "products.page.shipping.sizesValue",
  "products.page.shipping.empty",
  "products.page.shipping.profile",
  "products.page.shipping.more",
  "products.page.selling.title",
  "products.page.selling.discounts",
  "products.page.selling.discountsHint",
  "products.page.selling.discountsLabel",
]

const read = (catalog: Record<string, any>, key: string) =>
  key.split(".").reduce<any>((node, part) => node?.[part], catalog)

describe("product page parts", () => {
  it("lets plugins place parts in the seven product page zones", () => {
    for (const zone of PRODUCT_PART_ZONES) {
      expect(INJECTION_ZONES, zone).toContain(zone)
    }
  })

  it("has every new product page string in English and Spanish", () => {
    for (const key of NEW_KEYS) {
      expect(typeof read(en, key), `en ${key}`).toBe("string")
      expect(typeof read(es, key), `es ${key}`).toBe("string")
    }
  })

  it("says Pagly's words in Spanish", () => {
    expect(read(es, "products.page.variants.title")).toBe("Variantes y precios")
    expect(read(es, "products.page.blockers.title")).toBe("Para empezar a vender")
    expect(read(es, "products.page.where.title")).toBe("Dónde se vende")
    expect(read(es, "products.page.variants.untracked")).toBe("Sin control de stock")
    expect(read(es, "products.page.photos.main")).toBe("Principal")
  })
})

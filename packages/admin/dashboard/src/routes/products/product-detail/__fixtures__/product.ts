import type { ProductPageFacts } from "../use-product-page-facts"

/** Pagly: the product page's fixtures, shaped as the approved mock's "Remera lino". */
export const COLOR = {
  id: "opt_color",
  title: "Color",
  values: [
    { id: "optval_negro", value: "Negro", rank: 0 },
    { id: "optval_crudo", value: "Crudo", rank: 1 },
  ],
}

export const SIZE = {
  id: "opt_size",
  title: "Talle",
  values: [
    { id: "optval_m", value: "M", rank: 0 },
    { id: "optval_xl", value: "XL", rank: 1 },
  ],
}

export const DEFAULT_OPTION = {
  id: "opt_default",
  title: "Default option",
  values: [{ id: "optval_default", value: "Default option value", rank: 0 }],
}

export const makeProduct = (over: Record<string, unknown> = {}): any => ({
  id: "prod_1",
  title: "Remera lino",
  handle: "remera-lino",
  subtitle: "Lino 100 %, corte recto",
  description: "<p>Remera de lino con cuello redondo.</p>",
  material: null,
  status: "published",
  discountable: true,
  thumbnail: "http://localhost:9000/static/a.png",
  images: [{ id: "img_a", url: "http://localhost:9000/static/a.png", rank: 0 }],
  options: [COLOR, SIZE],
  sales_channels: [{ id: "sc_1", name: "Webshop" }],
  categories: [{ id: "pcat_1", name: "Remeras" }],
  type: { id: "ptyp_1", value: "Ropa" },
  type_id: "ptyp_1",
  tags: [{ id: "ptag_1", value: "lino" }],
  weight: 250,
  length: 30,
  width: 25,
  height: 3,
  hs_code: null,
  mid_code: null,
  origin_country: null,
  shipping_profile: { id: "sp_1", name: "Default", type: "default" },
  metadata: {},
  ...over,
})

export const makeVariant = (
  color: string | null,
  size: string | null,
  over: Record<string, unknown> = {}
): any => ({
  id: `variant_${color ?? "x"}_${size ?? "x"}`,
  title: [color, size].filter(Boolean).join(" / ") || "Default variant",
  sku: `RL-${color ?? ""}-${size ?? ""}`,
  manage_inventory: true,
  allow_backorder: false,
  inventory_quantity: 5,
  prices: [{ amount: 1290, currency_code: "uyu", rules: {} }],
  options: [
    ...(color ? [{ option_id: "opt_color", value: color }] : []),
    ...(size ? [{ option_id: "opt_size", value: size }] : []),
  ],
  inventory_items: [],
  ...over,
})

export const makeFacts = (
  over: Partial<ProductPageFacts> = {}
): ProductPageFacts => ({
  variants: [
    makeVariant("Negro", "M"),
    makeVariant("Negro", "XL", { inventory_quantity: 0 }),
  ],
  currency: "uyu",
  places: 1,
  sales: new Map(),
  cover: null,
  isPending: false,
  ...over,
})

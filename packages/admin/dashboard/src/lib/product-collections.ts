import { HttpTypes } from "@medusajs/types"

/**
 * Pagly: where @pagly/storefront registers how the product list reads a
 * product's collections, on globalThis, as it registers its store links. A
 * product can be in several collections, which the plugin keeps in its own
 * memberships rather than in `product.collection`
 * (Pagly-Core/pagly-app#258).
 */
export const PRODUCT_COLLECTIONS_KEY = "__paglyProductCollections"

export type ProductCollection = { id: string; title: string }

type ProductCollections = {
  /** The `fields` the product list asks for, in place of `*collection`. */
  fields: string
  /** A product's collections, from those fields. */
  read: (product: HttpTypes.AdminProduct) => ProductCollection[]
}

const registered = () =>
  (globalThis as Record<string, unknown>)[PRODUCT_COLLECTIONS_KEY] as
    | ProductCollections
    | undefined

/** The fields a product's collections are read from. */
export const productCollectionFields = (): string =>
  registered()?.fields ?? "*collection"

/** A product's collections: the plugin's reader, else Medusa's one collection. */
export const productCollections = (
  product: HttpTypes.AdminProduct
): ProductCollection[] => {
  const read = registered()?.read

  if (read) {
    return read(product)
  }

  return product.collection
    ? [{ id: product.collection.id, title: product.collection.title }]
    : []
}

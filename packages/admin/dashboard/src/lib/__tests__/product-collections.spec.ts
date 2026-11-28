import { afterEach, describe, expect, it } from "vitest"

import {
  PRODUCT_COLLECTIONS_KEY,
  productCollectionFields,
  productCollections,
} from "../product-collections"

/**
 * Pagly: a product can be in several collections, which @pagly/storefront
 * keeps in its own memberships rather than in `product.collection`
 * (Pagly-Core/pagly-app#258). The plugin registers on globalThis the fields
 * the product list asks for and how to read a product's collections from
 * them; without it the list reads Medusa's one collection, as before.
 */
const register = (value: unknown) => {
  ;(globalThis as Record<string, unknown>)[PRODUCT_COLLECTIONS_KEY] = value
}

afterEach(() => {
  delete (globalThis as Record<string, unknown>)[PRODUCT_COLLECTIONS_KEY]
})

describe("a product's collections", () => {
  it("are Medusa's one collection while nothing is registered", () => {
    expect(productCollectionFields()).toBe("*collection")
    expect(productCollections({ collection: { id: "pcol_1", title: "Verano" } } as any)).toEqual([
      { id: "pcol_1", title: "Verano" },
    ])
    expect(productCollections({ collection: null } as any)).toEqual([])
  })

  it("are what the registered reader says, from the fields it asks for", () => {
    register({
      fields: "*collection,collection_memberships.collection.id",
      read: (product: any) => product.memberships,
    })

    expect(productCollectionFields()).toBe("*collection,collection_memberships.collection.id")
    expect(
      productCollections({
        memberships: [
          { id: "pcol_1", title: "Verano" },
          { id: "pcol_2", title: "Ofertas" },
        ],
      } as any)
    ).toEqual([
      { id: "pcol_1", title: "Verano" },
      { id: "pcol_2", title: "Ofertas" },
    ])
  })
})

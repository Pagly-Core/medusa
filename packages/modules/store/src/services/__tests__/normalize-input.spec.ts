import StoreModuleService from "../store-module-service"

const normalize = (stores: Record<string, unknown>[]) =>
  (StoreModuleService as any).normalizeInput(stores) as Record<string, unknown>[]

// Pagly-Core/pagly-app#263: the metadata form sends a deleted key as "".
// Every module updated through the internal service drops such a key
// (mergeMetadata); the store, which updates with upsertWithReplace, kept it
// with an empty value.
describe("a store update's metadata", () => {
  it("leaves out a key sent as an empty string", () => {
    const [store] = normalize([{ id: "store_1", metadata: { removed: "", kept: "yes", zero: 0 } }])

    expect(store.metadata).toEqual({ kept: "yes", zero: 0 })
  })

  it("keeps the metadata it is sent otherwise, and none when none is sent", () => {
    expect(normalize([{ id: "store_1", metadata: { kept: "yes" } }])[0].metadata).toEqual({ kept: "yes" })
    expect(normalize([{ id: "store_1", name: "Tienda" }])[0]).not.toHaveProperty("metadata")
  })
})

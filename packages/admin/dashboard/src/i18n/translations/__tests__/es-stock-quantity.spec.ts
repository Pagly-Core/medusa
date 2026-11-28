import { describe, expect, it } from "vitest"

import es from "../es.json"

// Pagly-Core/pagly-app#267: adjusting stock below what is reserved said
// "La cantidad en stock no puede actualizarse a menos que la cantidad
// reservada de 0.", a sentence with no verb where "less than" was meant.
describe("the stock below the reserved quantity", () => {
  it("says the stock can't go below what is reserved", () => {
    expect(es.inventory.adjustInventory.errors.stockedQuantity).toBe(
      "La cantidad en stock no puede ser menor que la reservada ({{quantity}})."
    )
  })
})

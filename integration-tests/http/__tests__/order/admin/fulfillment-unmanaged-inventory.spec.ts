import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { ModuleRegistrationName, ProductStatus } from "@medusajs/utils"
import {
  adminHeaders,
  createAdminUser,
} from "../../../../helpers/create-admin-user"
import { setupTaxStructure } from "../../../../modules/__tests__/fixtures"
import { createOrderSeeder } from "../../fixtures/order"

jest.setTimeout(300000)

// An item whose variant doesn't manage inventory has no reservation, so its
// fulfillment item has no inventory item, whatever items the variant has.
medusaIntegrationTestRunner({
  testSuite: ({ dbConnection, getContainer, api, dbUtils }) => {
    let container
    let shippingProfile
    let product
    let variant
    let order
    let item
    let fulfillment

    beforeAll(async () => {
      container = getContainer()
      await setupTaxStructure(container.resolve(ModuleRegistrationName.TAX))
      await createAdminUser(dbConnection, adminHeaders, container)

      await dbUtils.snapshot()
    })

    beforeEach(async () => {
      shippingProfile = (
        await api.post(
          `/admin/shipping-profiles`,
          { name: "Unmanaged inventory", type: "default" },
          adminHeaders
        )
      ).data.shipping_profile

      product = (
        await api.post(
          "/admin/products",
          {
            title: "Linen shirt",
            status: ProductStatus.PUBLISHED,
            shipping_profile_id: shippingProfile.id,
            options: [{ title: "size", values: ["M"] }],
            variants: [
              {
                title: "M",
                sku: "linen-shirt-m",
                manage_inventory: false,
                prices: [{ currency_code: "usd", amount: 100 }],
                options: { size: "M" },
              },
            ],
          },
          adminHeaders
        )
      ).data.product

      variant = product.variants[0]
    })

    const placeOrderAndFulfill = async () => {
      const seeder = await createOrderSeeder({
        api,
        container,
        shippingProfileOverride: shippingProfile,
        additionalProducts: [{ variant_id: variant.id, quantity: 2 }],
      })

      item = seeder.order.items.find((i) => i.variant_id === variant.id)

      order = (
        await api.post(
          `/admin/orders/${seeder.order.id}/fulfillments?fields=*fulfillments`,
          {
            shipping_option_id: seeder.shippingOption.id,
            location_id: seeder.stockLocation.id,
            items: [{ id: item.id, quantity: 2 }],
          },
          adminHeaders
        )
      ).data.order

      fulfillment = order.fulfillments[0]
    }

    const ship = () =>
      api
        .post(
          `/admin/orders/${order.id}/fulfillments/${fulfillment.id}/shipments`,
          { items: [{ id: item.id, quantity: 2 }] },
          adminHeaders
        )
        .catch((e) => e.response)

    const cancel = () =>
      api
        .post(
          `/admin/orders/${order.id}/fulfillments/${fulfillment.id}/cancel`,
          {},
          adminHeaders
        )
        .catch((e) => e.response)

    const itemDetail = (response) =>
      response.data.order.items.find((i) => i.id === item.id).detail

    describe("with an inventory item still linked to the variant", () => {
      beforeEach(async () => {
        const inventoryItem = (
          await api.post(
            `/admin/inventory-items`,
            { sku: "linen-shirt-m" },
            adminHeaders
          )
        ).data.inventory_item

        // A required quantity other than 1, so a quantity divided by it shows
        await api.post(
          `/admin/products/${product.id}/variants/${variant.id}/inventory-items`,
          { inventory_item_id: inventoryItem.id, required_quantity: 2 },
          adminHeaders
        )

        await placeOrderAndFulfill()
      })

      it("ships the fulfillment", async () => {
        const response = await ship()

        expect(response.status).toEqual(200)
        expect(itemDetail(response)).toEqual(
          expect.objectContaining({
            fulfilled_quantity: 2,
            shipped_quantity: 2,
          })
        )
      })

      it("cancels the fulfillment", async () => {
        const response = await cancel()

        expect(response.status).toEqual(200)
        expect(itemDetail(response)).toEqual(
          expect.objectContaining({ fulfilled_quantity: 0 })
        )
      })
    })

    describe("when inventory management is turned on after the fulfillment", () => {
      beforeEach(async () => {
        await placeOrderAndFulfill()

        // Gives the variant a default inventory item
        await api.post(
          `/admin/products/${product.id}/variants/${variant.id}`,
          { manage_inventory: true },
          adminHeaders
        )
      })

      it("ships the fulfillment", async () => {
        const response = await ship()

        expect(response.status).toEqual(200)
        expect(itemDetail(response)).toEqual(
          expect.objectContaining({
            fulfilled_quantity: 2,
            shipped_quantity: 2,
          })
        )
      })

      it("cancels the fulfillment", async () => {
        const response = await cancel()

        expect(response.status).toEqual(200)
        expect(itemDetail(response)).toEqual(
          expect.objectContaining({ fulfilled_quantity: 0 })
        )
      })
    })
  },
})

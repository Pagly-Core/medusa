import { Modules, ProductStatus } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner, TestEventUtils } from "@medusajs/test-utils"
import {
  adminHeaders,
  createAdminUser,
  generatePublishableKey,
  generateStoreHeaders,
} from "../../../../helpers/create-admin-user"

jest.setTimeout(60 * 1000)

// Pagly: an order issues exactly one gift card per gift card unit bought, even
// when `order.placed` is delivered twice, and every new card announces itself
// with `gift_card.created` (what the gift card email will listen to).
medusaIntegrationTestRunner({
  testSuite: ({ dbConnection, api, getContainer, dbUtils }) => {
    let storeHeaders
    let region
    let salesChannel
    let giftCardProduct

    beforeAll(async () => {
      await createAdminUser(dbConnection, adminHeaders, getContainer())
      const publishableKey = await generatePublishableKey(getContainer())
      storeHeaders = generateStoreHeaders({ publishableKey })

      giftCardProduct = (
        await api.post(
          `/admin/products`,
          {
            title: "Gift card",
            status: ProductStatus.PUBLISHED,
            is_giftcard: true,
            options: [{ title: "Amount", values: ["1000"] }],
            variants: [
              {
                title: "1000",
                manage_inventory: false,
                options: { Amount: "1000" },
                prices: [{ amount: 1000, currency_code: "usd" }],
              },
            ],
          },
          adminHeaders
        )
      ).data.product

      salesChannel = (
        await api.post(
          `/admin/sales-channels`,
          { name: "issuing-channel" },
          adminHeaders
        )
      ).data.sales_channel

      region = (
        await api.post(
          "/admin/regions",
          {
            payment_providers: ["pp_system_default"],
            name: "issuing-region",
            currency_code: "usd",
          },
          adminHeaders
        )
      ).data.region

      await dbUtils.snapshot()
    })

    const eventBus = () => getContainer().resolve(Modules.EVENT_BUS)

    const buyGiftCards = async (quantity) => {
      const cart = (
        await api.post(
          `/store/carts`,
          {
            region_id: region.id,
            sales_channel_id: salesChannel.id,
            email: "buyer@customer.com",
            items: [{ variant_id: giftCardProduct.variants[0].id, quantity }],
          },
          storeHeaders
        )
      ).data.cart

      const paymentCollection = (
        await api.post(
          `/store/payment-collections`,
          { cart_id: cart.id },
          storeHeaders
        )
      ).data.payment_collection

      await api.post(
        `/store/payment-collections/${paymentCollection.id}/payment-sessions`,
        { provider_id: "pp_system_default" },
        storeHeaders
      )

      const placed = TestEventUtils.waitSubscribersExecution(
        "order.placed",
        eventBus()
      )
      const { order } = (
        await api.post(`/store/carts/${cart.id}/complete`, {}, storeHeaders)
      ).data
      await placed

      return order
    }

    const giftCardsOf = async (orderId) =>
      (
        await api.get(
          `/admin/gift-cards?reference_id=${orderId}&fields=id,code,value,currency_code,reference,reference_id,line_item_id`,
          adminHeaders
        )
      ).data.gift_cards

    describe("buying gift cards", () => {
      it("issues one card per unit, worth the unit price", async () => {
        const order = await buyGiftCards(2)

        const giftCards = await giftCardsOf(order.id)
        expect(giftCards).toHaveLength(2)
        expect(new Set(giftCards.map((gc) => gc.code)).size).toBe(2)
        giftCards.forEach((gc) =>
          expect(gc).toEqual(
            expect.objectContaining({
              value: 1000,
              currency_code: "usd",
              reference: "order",
              reference_id: order.id,
              line_item_id: order.items[0].id,
            })
          )
        )
      })

      it("issues no more cards when order.placed is delivered again", async () => {
        const order = await buyGiftCards(2)
        expect(await giftCardsOf(order.id)).toHaveLength(2)

        const replayed = TestEventUtils.waitSubscribersExecution(
          "order.placed",
          eventBus()
        )
        await eventBus().emit({ name: "order.placed", data: { id: order.id } })
        await replayed

        expect(await giftCardsOf(order.id)).toHaveLength(2)
      })

      it("announces each card bought with gift_card.created", async () => {
        const created = TestEventUtils.waitSubscribersExecution(
          "gift_card.created",
          eventBus(),
          { triggerCount: 2 }
        )

        const order = await buyGiftCards(2)
        const events = await created

        const ids = (await giftCardsOf(order.id)).map((gc) => gc.id).sort()
        expect(events.map(([event]) => event.data.id).sort()).toEqual(ids)
      })
    })

    describe("POST /admin/gift-cards", () => {
      it("announces the new card with gift_card.created", async () => {
        const created = TestEventUtils.waitSubscribersExecution(
          "gift_card.created",
          eventBus()
        )

        const { gift_card } = (
          await api.post(
            `/admin/gift-cards`,
            { currency_code: "usd", value: 500 },
            adminHeaders
          )
        ).data

        const event = await created
        expect(event.data).toEqual({ id: gift_card.id })
      })
    })
  },
})

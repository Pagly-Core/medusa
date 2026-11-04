import { ProductStatus } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  adminHeaders,
  createAdminUser,
  generatePublishableKey,
  generateStoreHeaders,
} from "../../../../helpers/create-admin-user"

jest.setTimeout(60 * 1000)

// Pagly: store routes are public. A gift card's code may only reach the
// shopper who typed it, and its merchant note and its origin (the buyer's
// order and line item, which lead to the buyer's address through the public
// order read) never reach anyone through the store API.
const PRIVATE_GIFT_CARD_FIELDS = [
  "note",
  "reference",
  "reference_id",
  "line_item_id",
  "line_item",
  "metadata",
]

const expectNoPrivateFields = (giftCard) => {
  for (const field of PRIVATE_GIFT_CARD_FIELDS) {
    expect(giftCard).not.toHaveProperty(field)
  }
}

medusaIntegrationTestRunner({
  testSuite: ({ dbConnection, api, getContainer, dbUtils }) => {
    let storeHeaders
    let region
    let salesChannel
    let variant
    let giftCard

    beforeAll(async () => {
      await createAdminUser(dbConnection, adminHeaders, getContainer())
      const publishableKey = await generatePublishableKey(getContainer())
      storeHeaders = generateStoreHeaders({ publishableKey })

      const product = (
        await api.post(
          `/admin/products`,
          {
            title: "Privacy product",
            status: ProductStatus.PUBLISHED,
            options: [{ title: "size", values: ["large"] }],
            variants: [
              {
                title: "large",
                manage_inventory: false,
                options: { size: "large" },
                prices: [{ amount: 800, currency_code: "usd" }],
              },
            ],
          },
          adminHeaders
        )
      ).data.product
      variant = product.variants[0]

      salesChannel = (
        await api.post(
          `/admin/sales-channels`,
          { name: "privacy-channel" },
          adminHeaders
        )
      ).data.sales_channel

      region = (
        await api.post(
          "/admin/regions",
          {
            payment_providers: ["pp_system_default"],
            name: "privacy-region",
            currency_code: "usd",
          },
          adminHeaders
        )
      ).data.region

      giftCard = (
        await api.post(
          `/admin/gift-cards`,
          {
            currency_code: "usd",
            value: 400,
            code: "GIFT-PRIV-ACY0-0000-9XYZ",
            note: "Issued after complaint #123",
            reference: "order",
            reference_id: "order_buyer",
            line_item_id: "ordli_buyer",
            metadata: { issued_by: "support" },
          },
          adminHeaders
        )
      ).data.gift_card

      await dbUtils.snapshot()
    })

    const createCart = async () =>
      (
        await api.post(
          `/store/carts`,
          {
            region_id: region.id,
            sales_channel_id: salesChannel.id,
            items: [{ variant_id: variant.id, quantity: 1 }],
          },
          storeHeaders
        )
      ).data.cart

    describe("GET /store/gift-cards/:code", () => {
      it("returns what a holder needs and nothing the merchant wrote", async () => {
        const { gift_card } = (
          await api.get(`/store/gift-cards/${giftCard.code}`, storeHeaders)
        ).data

        expect(gift_card).toEqual(
          expect.objectContaining({
            id: giftCard.id,
            code: giftCard.code,
            value: 400,
            currency_code: "usd",
          })
        )
        expectNoPrivateFields(gift_card)
      })

      it("ignores requests for private fields", async () => {
        const fields = [
          "+note",
          "+reference",
          "+reference_id",
          "+line_item_id",
          "+metadata",
          "*line_item",
          "+line_item.title",
          "*store_credit_account",
        ].join(",")

        const { gift_card } = (
          await api.get(
            `/store/gift-cards/${giftCard.code}?fields=${fields}`,
            storeHeaders
          )
        ).data

        expectNoPrivateFields(gift_card)
      })

      it("still tells the holder the balance left", async () => {
        const { gift_card } = (
          await api.get(
            `/store/gift-cards/${giftCard.code}?fields=+store_credit_account.balance,+store_credit_account.credits,+store_credit_account.debits`,
            storeHeaders
          )
        ).data

        expect(gift_card.store_credit_account).toEqual(
          expect.objectContaining({ balance: 400, credits: 400, debits: 0 })
        )
        expectNoPrivateFields(gift_card)
      })
    })

    describe("carts", () => {
      it("returns only public gift card fields when a card is applied", async () => {
        const cart = await createCart()

        const applied = (
          await api.post(
            `/store/carts/${cart.id}/gift-cards`,
            { code: giftCard.code },
            storeHeaders
          )
        ).data.cart

        expect(applied.gift_cards).toEqual([
          expect.objectContaining({ id: giftCard.id, code: giftCard.code }),
        ])
        applied.gift_cards.forEach(expectNoPrivateFields)
      })

      it("ignores requests for private gift card fields on a cart", async () => {
        const cart = await createCart()

        await api.post(
          `/store/carts/${cart.id}/gift-cards`,
          { code: giftCard.code },
          storeHeaders
        )

        const fields = [
          "*gift_cards",
          "+gift_cards.note",
          "+gift_cards.reference_id",
          "+gift_cards.metadata",
          "+gift_cards.line_item_id",
          "*gift_cards.line_item",
          "+gift_cards.line_item.title",
        ].join(",")

        const read = (
          await api.get(`/store/carts/${cart.id}?fields=${fields}`, storeHeaders)
        ).data.cart

        ;(read.gift_cards ?? []).forEach(expectNoPrivateFields)
      })
    })

    describe("GET /store/orders/:id", () => {
      it("never returns the gift cards used on an order, whatever is asked", async () => {
        const cart = await createCart()

        await api.post(
          `/store/carts/${cart.id}/gift-cards`,
          { code: giftCard.code },
          storeHeaders
        )

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

        const { order } = (
          await api.post(`/store/carts/${cart.id}/complete`, {}, storeHeaders)
        ).data

        for (const fields of [
          "*gift_cards",
          "+gift_cards.code",
          "+gift_cards.id,+gift_cards.code,+gift_cards.value",
        ]) {
          const read = (
            await api.get(
              `/store/orders/${order.id}?fields=${fields}`,
              storeHeaders
            )
          ).data.order

          expect(read).not.toHaveProperty("gift_cards")
        }

        // the order still says a gift card paid part of it, by its last four
        const read = (
          await api.get(`/store/orders/${order.id}`, storeHeaders)
        ).data.order

        expect(read.credit_lines).toEqual([
          expect.objectContaining({
            reference: "gift-card",
            amount: 400,
            metadata: expect.objectContaining({ code_last4: "9XYZ" }),
          }),
        ])
        expect(JSON.stringify(read)).not.toContain(giftCard.code)
      })
    })
  },
})

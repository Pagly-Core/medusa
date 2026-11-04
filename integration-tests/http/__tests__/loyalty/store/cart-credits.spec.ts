import { ProductStatus } from "@medusajs/framework/utils"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  adminHeaders,
  createAdminUser,
  generatePublishableKey,
  generateStoreHeaders,
} from "../../../../helpers/create-admin-user"
import { createAuthenticatedCustomer } from "../../../../modules/helpers/create-authenticated-customer"

jest.setTimeout(60 * 1000)

// Pagly: a cart's gift card and store credit lines follow the cart and the
// balances behind them, so a changed cart never owes less than zero and
// checkout never debits more than an account holds.
const CART_FIELDS =
  "?fields=+credit_line_total,+gift_cards.id,+gift_cards.code"

medusaIntegrationTestRunner({
  testSuite: ({ dbConnection, api, getContainer, dbUtils }) => {
    let storeHeaders
    let ownerHeaders
    let strangerHeaders
    let owner
    let region
    let salesChannel
    let expensiveVariant
    let cheapVariant
    let ownerAccount

    beforeAll(async () => {
      await createAdminUser(dbConnection, adminHeaders, getContainer())
      const publishableKey = await generatePublishableKey(getContainer())
      storeHeaders = generateStoreHeaders({ publishableKey })

      const product = (
        await api.post(
          `/admin/products`,
          {
            title: "Cart credits product",
            status: ProductStatus.PUBLISHED,
            options: [{ title: "size", values: ["large", "small"] }],
            variants: [
              {
                title: "expensive",
                manage_inventory: false,
                options: { size: "large" },
                prices: [{ amount: 800, currency_code: "usd" }],
              },
              {
                title: "cheap",
                manage_inventory: false,
                options: { size: "small" },
                prices: [{ amount: 400, currency_code: "usd" }],
              },
            ],
          },
          adminHeaders
        )
      ).data.product

      expensiveVariant = product.variants.find((v) => v.title === "expensive")
      cheapVariant = product.variants.find((v) => v.title === "cheap")

      salesChannel = (
        await api.post(
          `/admin/sales-channels`,
          { name: "cart-credits-channel" },
          adminHeaders
        )
      ).data.sales_channel

      region = (
        await api.post(
          "/admin/regions",
          {
            payment_providers: ["pp_system_default"],
            name: "cart-credits-region",
            currency_code: "usd",
          },
          adminHeaders
        )
      ).data.region

      const ownerUser = await createAuthenticatedCustomer(api, storeHeaders, {
        email: "owner@customer.com",
      })
      owner = ownerUser.customer
      ownerHeaders = {
        headers: {
          ...storeHeaders.headers,
          Authorization: `Bearer ${ownerUser.jwt}`,
        },
      }

      const strangerUser = await createAuthenticatedCustomer(
        api,
        storeHeaders,
        { email: "stranger@customer.com" }
      )
      strangerHeaders = {
        headers: {
          ...storeHeaders.headers,
          Authorization: `Bearer ${strangerUser.jwt}`,
        },
      }

      ownerAccount = (
        await api.post(
          `/admin/store-credit-accounts`,
          { customer_id: owner.id, currency_code: "usd" },
          adminHeaders
        )
      ).data.store_credit_account

      await api.post(
        `/admin/store-credit-accounts/${ownerAccount.id}/credit`,
        { amount: 1000 },
        adminHeaders
      )

      await dbUtils.snapshot()
    })

    const createCart = async (headers, items) =>
      (
        await api.post(
          `/store/carts`,
          { region_id: region.id, sales_channel_id: salesChannel.id, items },
          headers
        )
      ).data.cart

    const getCart = async (cartId, headers) =>
      (await api.get(`/store/carts/${cartId}${CART_FIELDS}`, headers)).data
        .cart

    const createGiftCard = async (code, value) =>
      (
        await api.post(
          `/admin/gift-cards`,
          { currency_code: "usd", value, code },
          adminHeaders
        )
      ).data.gift_card

    const giftCardAccountId = async (giftCardId) =>
      (
        await api.get(
          `/admin/gift-cards/${giftCardId}?fields=*store_credit_account`,
          adminHeaders
        )
      ).data.gift_card.store_credit_account.id

    const debit = (accountId, amount) =>
      api.post(
        `/admin/store-credit-accounts/${accountId}/debit`,
        { amount },
        adminHeaders
      )

    const linesFor = (cart, reference) =>
      cart.credit_lines.filter((line) => line.reference === reference)

    describe("refreshing gift card lines", () => {
      it("drops a gift card with no balance left instead of refusing the cart change", async () => {
        const cart = await createCart(storeHeaders, [
          { variant_id: expensiveVariant.id, quantity: 1 },
        ])
        const giftCard = await createGiftCard("EMPTY-0001", 400)

        await api.post(
          `/store/carts/${cart.id}/gift-cards`,
          { code: giftCard.code },
          storeHeaders
        )
        await debit(await giftCardAccountId(giftCard.id), 400)

        const response = await api
          .post(
            `/store/carts/${cart.id}/line-items${CART_FIELDS}`,
            { variant_id: cheapVariant.id, quantity: 1 },
            storeHeaders
          )
          .catch((e) => e.response)

        expect(response.status).toBe(200)
        expect(response.data.cart).toEqual(
          expect.objectContaining({
            total: 1200,
            credit_line_total: 0,
            gift_cards: [],
            credit_lines: [],
          })
        )
      })

      it("keeps the cards that still hold a balance next to a dropped one", async () => {
        const cart = await createCart(storeHeaders, [
          { variant_id: expensiveVariant.id, quantity: 1 },
        ])
        const emptied = await createGiftCard("EMPTY-0002", 300)
        const kept = await createGiftCard("KEPT-0002", 300)

        await api.post(
          `/store/carts/${cart.id}/gift-cards`,
          { code: emptied.code },
          storeHeaders
        )
        await api.post(
          `/store/carts/${cart.id}/gift-cards`,
          { code: kept.code },
          storeHeaders
        )
        await debit(await giftCardAccountId(emptied.id), 300)

        await api.post(
          `/store/carts/${cart.id}/line-items`,
          { variant_id: cheapVariant.id, quantity: 1 },
          storeHeaders
        )

        const refreshed = await getCart(cart.id, storeHeaders)
        expect(refreshed.gift_cards).toEqual([
          expect.objectContaining({ id: kept.id }),
        ])
        expect(refreshed.credit_lines).toEqual([
          expect.objectContaining({
            reference: "gift-card",
            reference_id: kept.id,
            amount: 300,
          }),
        ])
        expect(refreshed.total).toBe(900)
      })

      it("names the card on its credit line with the code's last four characters", async () => {
        const cart = await createCart(storeHeaders, [
          { variant_id: expensiveVariant.id, quantity: 1 },
        ])
        const giftCard = await createGiftCard("GIFT-AAAA-BBBB-CCCC-7KQ2", 200)

        await api.post(
          `/store/carts/${cart.id}/gift-cards`,
          { code: giftCard.code },
          storeHeaders
        )

        const withCard = await getCart(cart.id, storeHeaders)
        expect(linesFor(withCard, "gift-card")).toEqual([
          expect.objectContaining({
            amount: 200,
            metadata: expect.objectContaining({ code_last4: "7KQ2" }),
          }),
        ])

        // and keeps it when a cart change rebuilds the line
        await api.post(
          `/store/carts/${cart.id}/line-items`,
          { variant_id: cheapVariant.id, quantity: 1 },
          storeHeaders
        )

        const refreshed = await getCart(cart.id, storeHeaders)
        expect(linesFor(refreshed, "gift-card")).toEqual([
          expect.objectContaining({
            metadata: expect.objectContaining({ code_last4: "7KQ2" }),
          }),
        ])
      })
    })

    describe("refreshing store credit lines", () => {
      it("caps a store credit line to what the cart still owes when the cart shrinks", async () => {
        const cart = await createCart(ownerHeaders, [
          { variant_id: expensiveVariant.id, quantity: 1 },
          { variant_id: cheapVariant.id, quantity: 1 },
        ])

        await api.post(
          `/store/carts/${cart.id}/store-credits`,
          { amount: 1000 },
          ownerHeaders
        )

        const expensiveItem = cart.items.find(
          (item) => item.variant_id === expensiveVariant.id
        )
        await api.delete(
          `/store/carts/${cart.id}/line-items/${expensiveItem.id}`,
          ownerHeaders
        )

        const refreshed = await getCart(cart.id, ownerHeaders)
        expect(linesFor(refreshed, "store-credit")).toEqual([
          expect.objectContaining({
            amount: 400,
            reference_id: ownerAccount.id,
          }),
        ])
        expect(refreshed.total).toBe(0)
      })

      it("caps a store credit line to the balance left when the account was spent elsewhere", async () => {
        const cart = await createCart(ownerHeaders, [
          { variant_id: expensiveVariant.id, quantity: 1 },
        ])

        await api.post(
          `/store/carts/${cart.id}/store-credits`,
          { amount: 500 },
          ownerHeaders
        )
        await debit(ownerAccount.id, 700)

        await api.post(
          `/store/carts/${cart.id}/line-items`,
          { variant_id: cheapVariant.id, quantity: 1 },
          ownerHeaders
        )

        const refreshed = await getCart(cart.id, ownerHeaders)
        expect(linesFor(refreshed, "store-credit")).toEqual([
          expect.objectContaining({ amount: 300 }),
        ])
        expect(refreshed.total).toBe(900)
      })

      it("drops a store credit line when the account has nothing left", async () => {
        const cart = await createCart(ownerHeaders, [
          { variant_id: expensiveVariant.id, quantity: 1 },
        ])

        await api.post(
          `/store/carts/${cart.id}/store-credits`,
          { amount: 500 },
          ownerHeaders
        )
        await debit(ownerAccount.id, 1000)

        const response = await api
          .post(
            `/store/carts/${cart.id}/line-items`,
            { variant_id: cheapVariant.id, quantity: 1 },
            ownerHeaders
          )
          .catch((e) => e.response)

        expect(response.status).toBe(200)

        const refreshed = await getCart(cart.id, ownerHeaders)
        expect(linesFor(refreshed, "store-credit")).toEqual([])
        expect(refreshed.total).toBe(1200)
      })

      it("fills what store credit leaves with gift cards, never below zero", async () => {
        const cart = await createCart(ownerHeaders, [
          { variant_id: expensiveVariant.id, quantity: 1 },
          { variant_id: cheapVariant.id, quantity: 1 },
        ])
        const giftCard = await createGiftCard("FILL-0001", 500)

        await api.post(
          `/store/carts/${cart.id}/store-credits`,
          { amount: 900 },
          ownerHeaders
        )
        await api.post(
          `/store/carts/${cart.id}/gift-cards`,
          { code: giftCard.code },
          ownerHeaders
        )

        const expensiveItem = cart.items.find(
          (item) => item.variant_id === expensiveVariant.id
        )
        await api.delete(
          `/store/carts/${cart.id}/line-items/${expensiveItem.id}`,
          ownerHeaders
        )

        const refreshed = await getCart(cart.id, ownerHeaders)
        expect(linesFor(refreshed, "store-credit")).toEqual([
          expect.objectContaining({ amount: 400 }),
        ])
        expect(linesFor(refreshed, "gift-card")).toEqual([])
        expect(refreshed.total).toBe(0)
      })
    })

    describe("POST /store/carts/:id/store-credits", () => {
      it("refuses a signed-in customer who does not own the cart", async () => {
        const cart = await createCart(ownerHeaders, [
          { variant_id: expensiveVariant.id, quantity: 1 },
        ])

        const response = await api
          .post(
            `/store/carts/${cart.id}/store-credits`,
            { amount: 500 },
            strangerHeaders
          )
          .catch((e) => e.response)

        expect(response.status).toBe(403)

        const untouched = await getCart(cart.id, ownerHeaders)
        expect(linesFor(untouched, "store-credit")).toEqual([])
        expect(untouched.total).toBe(800)
      })

      it("lets the owner apply and remove their store credit", async () => {
        const cart = await createCart(ownerHeaders, [
          { variant_id: expensiveVariant.id, quantity: 1 },
        ])

        const applied = (
          await api.post(
            `/store/carts/${cart.id}/store-credits`,
            { amount: 500 },
            ownerHeaders
          )
        ).data.cart
        expect(applied.total).toBe(300)

        const removed = (
          await api.post(
            `/store/carts/${cart.id}/store-credits`,
            { amount: 0 },
            ownerHeaders
          )
        ).data.cart
        expect(removed.total).toBe(800)
      })
    })
  },
})

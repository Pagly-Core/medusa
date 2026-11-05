import {
  addToCartWorkflow,
  getVariantsAndItemsWithPrices,
  refreshCartItemsWorkflow,
  updateLineItemInCartWorkflow,
} from "@medusajs/core-flows"
import { StepResponse } from "@medusajs/framework/workflows-sdk"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  MedusaError,
  Modules,
  PriceListStatus,
  PriceListType,
  ProductStatus,
} from "@medusajs/utils"
import {
  adminHeaders,
  createAdminUser,
  generatePublishableKey,
  generateStoreHeaders,
} from "../../../../helpers/create-admin-user"
import { createAuthenticatedCustomer } from "../../../helpers/create-authenticated-customer"
import { setupTaxStructure } from "../../fixtures"

jest.setTimeout(100000)

const env = {}

// What the test handler charges per unit for an engraved line, by currency.
const ENGRAVING: Record<string, number> = { usd: 350, eur: 300 }

type HookCall = {
  workflow: "prices" | "update-line-item"
  input: any
}

medusaIntegrationTestRunner({
  env,
  testSuite: ({ dbConnection, getContainer, api, dbUtils }) => {
    describe("setUnitPriceAdditions hook", () => {
      let appContainer
      let storeHeaders
      let storeHeadersWithCustomer
      let customer
      let usRegion
      let euRegion
      let salesChannel
      let variantId

      // A workflow takes a single handler per hook, so each workflow gets one
      // handler for the whole file and the tests switch what it returns.
      let additionsFor: ((input: any) => number[] | undefined) | undefined
      let calls: HookCall[] = []

      const engravingAdditions = (input: any) =>
        input.items.map((item) =>
          item?.metadata?.engraving ? ENGRAVING[input.currency_code] : 0
        )

      const handlerFor =
        (workflow: HookCall["workflow"]) =>
        (input: any): StepResponse<number[] | undefined> => {
          calls.push({ workflow, input })
          return new StepResponse(additionsFor?.(input))
        }

      beforeAll(async () => {
        appContainer = getContainer()

        await createAdminUser(dbConnection, adminHeaders, appContainer)
        const publishableKey = await generatePublishableKey(appContainer)
        storeHeaders = generateStoreHeaders({ publishableKey })

        const result = await createAuthenticatedCustomer(api, storeHeaders, {
          first_name: "Ana",
          last_name: "Grabado",
          email: "ana@grabado.test",
        })
        customer = result.customer
        storeHeadersWithCustomer = {
          headers: {
            ...storeHeaders.headers,
            authorization: `Bearer ${result.jwt}`,
          },
        }

        await setupTaxStructure(appContainer.resolve(Modules.TAX))

        const shippingProfile = (
          await api.post(
            `/admin/shipping-profiles`,
            { name: "default", type: "default" },
            adminHeaders
          )
        ).data.shipping_profile

        usRegion = (
          await api.post(
            "/admin/regions",
            { name: "US", currency_code: "usd", countries: ["us"] },
            adminHeaders
          )
        ).data.region

        euRegion = (
          await api.post(
            "/admin/regions",
            { name: "EU", currency_code: "eur", automatic_taxes: false },
            adminHeaders
          )
        ).data.region

        salesChannel = (
          await api.post(
            "/admin/sales-channels",
            { name: "Webshop" },
            adminHeaders
          )
        ).data.sales_channel

        const product = (
          await api.post(
            "/admin/products",
            {
              title: "Engravable lighter",
              handle: "engravable-lighter",
              status: ProductStatus.PUBLISHED,
              shipping_profile_id: shippingProfile.id,
              options: [{ title: "Finish", values: ["Steel"] }],
              variants: [
                {
                  title: "Steel",
                  sku: "LIGHTER-STEEL",
                  options: { Finish: "Steel" },
                  manage_inventory: false,
                  prices: [
                    { amount: 1500, currency_code: "usd" },
                    { amount: 1300, currency_code: "eur" },
                  ],
                },
              ],
            },
            adminHeaders
          )
        ).data.product
        variantId = product.variants[0].id

        await dbUtils.snapshot()
      })

      const createCart = async (body: Record<string, unknown> = {}) =>
        (
          await api.post(
            `/store/carts`,
            {
              currency_code: "usd",
              region_id: usRegion.id,
              sales_channel_id: salesChannel.id,
              ...body,
            },
            storeHeaders
          )
        ).data.cart

      const addLine = (
        cartId: string,
        {
          quantity = 1,
          metadata,
          headers = storeHeaders,
        }: {
          quantity?: number
          metadata?: Record<string, unknown>
          headers?: Record<string, unknown>
        } = {}
      ) =>
        api.post(
          `/store/carts/${cartId}/line-items`,
          { variant_id: variantId, quantity, metadata },
          headers
        )

      const engraved = { engraving: "Ana" }

      describe("without a handler", () => {
        it("prices a line at the upstream price", async () => {
          const cart = await createCart()

          let response = await addLine(cart.id, { metadata: engraved })

          expect(response.status).toEqual(200)
          expect(response.data.cart.items).toEqual([
            expect.objectContaining({
              unit_price: 1500,
              is_custom_price: false,
              metadata: engraved,
            }),
          ])

          response = await api.post(
            `/store/carts/${cart.id}/line-items/${response.data.cart.items[0].id}`,
            { quantity: 2 },
            storeHeaders
          )

          expect(response.status).toEqual(200)
          expect(response.data.cart.items).toEqual([
            expect.objectContaining({ unit_price: 1500, quantity: 2 }),
          ])
        })
      })

      describe("with a handler", () => {
        beforeAll(() => {
          // Optional calls keep the red phase failing on assertions while the
          // hook does not exist yet.
          getVariantsAndItemsWithPrices?.hooks?.setUnitPriceAdditions?.(
            handlerFor("prices")
          )
          updateLineItemInCartWorkflow.hooks?.setUnitPriceAdditions?.(
            handlerFor("update-line-item")
          )
        })

        beforeEach(() => {
          additionsFor = engravingAdditions
          calls = []
        })

        it("is exposed on both workflows", () => {
          expect(
            typeof getVariantsAndItemsWithPrices?.hooks?.setUnitPriceAdditions
          ).toEqual("function")
          expect(
            typeof updateLineItemInCartWorkflow.hooks?.setUnitPriceAdditions
          ).toEqual("function")
        })

        it("adds the amount to a line added from the store and keeps it a non-custom price", async () => {
          const cart = await createCart()

          const response = await addLine(cart.id, { metadata: engraved })

          expect(response.status).toEqual(200)
          expect(response.data.cart.items).toEqual([
            expect.objectContaining({
              unit_price: 1850,
              is_custom_price: false,
              compare_at_unit_price: null,
              metadata: engraved,
            }),
          ])
          expect(response.data.cart.total).toEqual(1850)

          const priceCall = calls.find((c) => c.workflow === "prices")
          expect(priceCall?.input).toEqual(
            expect.objectContaining({
              currency_code: "usd",
              cart: expect.objectContaining({ id: cart.id }),
              items: [
                expect.objectContaining({
                  variant_id: variantId,
                  quantity: 1,
                  metadata: engraved,
                }),
              ],
              variants: [expect.objectContaining({ id: variantId })],
            })
          )
        })

        it("keeps a line without the metadata at the variant price", async () => {
          const cart = await createCart()

          const response = await addLine(cart.id, { metadata: { gift: "yes" } })

          expect(response.status).toEqual(200)
          expect(response.data.cart.items).toEqual([
            expect.objectContaining({ unit_price: 1500, is_custom_price: false }),
          ])
        })

        it("adds the amount to the sale price and to the compare-at price", async () => {
          await api.post(
            `/admin/price-lists`,
            {
              title: "Sale",
              description: "Sale",
              status: PriceListStatus.ACTIVE,
              type: PriceListType.SALE,
              prices: [
                { amount: 1000, currency_code: "usd", variant_id: variantId },
              ],
            },
            adminHeaders
          )
          const cart = await createCart()

          await addLine(cart.id)
          const response = await addLine(cart.id, { metadata: engraved })

          expect(response.status).toEqual(200)
          expect(response.data.cart.items).toHaveLength(2)
          expect(response.data.cart.items).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                metadata: engraved,
                unit_price: 1350,
                compare_at_unit_price: 1850,
                is_custom_price: false,
              }),
              expect.objectContaining({
                unit_price: 1000,
                compare_at_unit_price: 1500,
              }),
            ])
          )
        })

        it("prices a merged line at the tier price for its new quantity plus the amount", async () => {
          await api.post(
            `/admin/price-lists`,
            {
              title: "Two or more",
              description: "Tier",
              status: PriceListStatus.ACTIVE,
              type: PriceListType.SALE,
              prices: [
                {
                  amount: 1200,
                  currency_code: "usd",
                  variant_id: variantId,
                  min_quantity: 2,
                },
              ],
            },
            adminHeaders
          )
          const cart = await createCart()

          let response = await addLine(cart.id, { metadata: engraved })
          expect(response.data.cart.items).toEqual([
            expect.objectContaining({ quantity: 1, unit_price: 1850 }),
          ])

          calls = []
          response = await addLine(cart.id, { metadata: engraved })

          expect(response.status).toEqual(200)
          expect(response.data.cart.items).toEqual([
            expect.objectContaining({
              quantity: 2,
              unit_price: 1550,
              compare_at_unit_price: 1850,
              is_custom_price: false,
            }),
          ])
          expect(
            calls.find((c) => c.workflow === "prices")?.input.items
          ).toEqual([expect.objectContaining({ quantity: 2 })])
        })

        it("keeps the amount when the quantity changes", async () => {
          const cart = await createCart()
          const lineId = (await addLine(cart.id, { metadata: engraved })).data
            .cart.items[0].id

          calls = []
          const response = await api.post(
            `/store/carts/${cart.id}/line-items/${lineId}`,
            { quantity: 3 },
            storeHeaders
          )

          expect(response.status).toEqual(200)
          expect(response.data.cart.items).toEqual([
            expect.objectContaining({
              quantity: 3,
              unit_price: 1850,
              is_custom_price: false,
            }),
          ])
          expect(response.data.cart.total).toEqual(5550)
          expect(
            calls.find((c) => c.workflow === "update-line-item")?.input
          ).toEqual(
            expect.objectContaining({
              currency_code: "usd",
              cart: expect.objectContaining({ id: cart.id }),
              items: [
                expect.objectContaining({
                  id: lineId,
                  quantity: 3,
                  metadata: engraved,
                }),
              ],
            })
          )
        })

        it("follows a metadata change made through a line update", async () => {
          const cart = await createCart()
          const lineId = (await addLine(cart.id)).data.cart.items[0].id

          let response = await api.post(
            `/store/carts/${cart.id}/line-items/${lineId}`,
            { quantity: 1, metadata: engraved },
            storeHeaders
          )

          expect(response.status).toEqual(200)
          expect(response.data.cart.items).toEqual([
            expect.objectContaining({ unit_price: 1850, metadata: engraved }),
          ])

          // An empty string removes a metadata key.
          response = await api.post(
            `/store/carts/${cart.id}/line-items/${lineId}`,
            { quantity: 1, metadata: { engraving: "" } },
            storeHeaders
          )

          expect(response.status).toEqual(200)
          expect(response.data.cart.items).toEqual([
            expect.objectContaining({ unit_price: 1500, metadata: {} }),
          ])
        })

        it("keeps the line and reprices it in the new currency when the region changes", async () => {
          const cart = await createCart()
          await addLine(cart.id, { metadata: engraved })

          calls = []
          const response = await api.post(
            `/store/carts/${cart.id}`,
            { region_id: euRegion.id },
            storeHeaders
          )

          expect(response.status).toEqual(200)
          expect(response.data.cart.currency_code).toEqual("eur")
          expect(response.data.cart.items).toEqual([
            expect.objectContaining({
              unit_price: 1600,
              is_custom_price: false,
              metadata: engraved,
            }),
          ])
          expect(
            calls.filter((c) => c.workflow === "prices").map((c) => c.input)
          ).toContainEqual(expect.objectContaining({ currency_code: "eur" }))
        })

        it("reprices the line when the cart is transferred to a customer", async () => {
          const customerGroup = (
            await api.post(
              "/admin/customer-groups",
              { name: "VIP" },
              adminHeaders
            )
          ).data.customer_group
          await api.post(
            `/admin/customer-groups/${customerGroup.id}/customers`,
            { add: [customer.id] },
            adminHeaders
          )
          await api.post(
            `/admin/price-lists`,
            {
              title: "VIP",
              description: "VIP",
              status: PriceListStatus.ACTIVE,
              type: PriceListType.SALE,
              prices: [
                { amount: 1100, currency_code: "usd", variant_id: variantId },
              ],
              rules: { "customer.groups.id": [customerGroup.id] },
            },
            adminHeaders
          )
          const cart = await createCart()
          const added = await addLine(cart.id, { metadata: engraved })
          expect(added.data.cart.items).toEqual([
            expect.objectContaining({ unit_price: 1850 }),
          ])

          const response = await api.post(
            `/store/carts/${cart.id}/customer`,
            {},
            storeHeadersWithCustomer
          )

          expect(response.status).toEqual(200)
          expect(response.data.cart.items).toEqual([
            expect.objectContaining({
              unit_price: 1450,
              is_custom_price: false,
            }),
          ])
        })

        it("adds the amount to the lines a cart is created with", async () => {
          // Both lines are priced in one context, so they share one calculated
          // price set: the plain line shows that the addition copies it.
          const cart = await createCart({
            items: [
              { variant_id: variantId, quantity: 1 },
              { variant_id: variantId, quantity: 1, metadata: engraved },
            ],
          })

          expect(cart.items).toHaveLength(2)
          expect(cart.items).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                metadata: engraved,
                unit_price: 1850,
                is_custom_price: false,
              }),
              expect.objectContaining({
                unit_price: 1500,
                is_custom_price: false,
              }),
            ])
          )
        })

        it("leaves a custom-priced line at its custom price", async () => {
          const cart = await createCart()

          await addToCartWorkflow(appContainer).run({
            input: {
              cart_id: cart.id,
              items: [
                {
                  variant_id: variantId,
                  quantity: 1,
                  unit_price: 999,
                  metadata: engraved,
                },
              ],
            },
          })
          await refreshCartItemsWorkflow(appContainer).run({
            input: { cart_id: cart.id, force_refresh: true },
          })

          const { cart: refreshed } = (
            await api.get(`/store/carts/${cart.id}`, storeHeaders)
          ).data

          expect(refreshed.items).toEqual([
            expect.objectContaining({
              unit_price: 999,
              is_custom_price: true,
            }),
          ])
        })

        it("fails the add when the handler throws", async () => {
          additionsFor = (input) => {
            throw new MedusaError(
              MedusaError.Types.NOT_ALLOWED,
              `Engraving has no price in ${input.currency_code}`
            )
          }
          const cart = await createCart()

          const { response } = await addLine(cart.id, {
            metadata: engraved,
          }).catch((e) => e)

          expect(response?.status).toEqual(400)
          expect(response?.data.message).toEqual(
            "Engraving has no price in usd"
          )

          const { cart: unchanged } = (
            await api.get(`/store/carts/${cart.id}`, storeHeaders)
          ).data
          expect(unchanged.items).toEqual([])
        })

        it("removes a line through a quantity of 0 even when the handler refuses that line", async () => {
          const cart = await createCart()
          const lineId = (await addLine(cart.id, { metadata: engraved })).data
            .cart.items[0].id

          additionsFor = (input) => {
            if (input.items.some((item) => item?.metadata?.engraving)) {
              throw new MedusaError(
                MedusaError.Types.NOT_ALLOWED,
                "Engraving is no longer offered"
              )
            }
            return input.items.map(() => 0)
          }

          const response = await api.post(
            `/store/carts/${cart.id}/line-items/${lineId}`,
            { quantity: 0 },
            storeHeaders
          )

          expect(response.status).toEqual(200)
          expect(response.data.cart.items).toEqual([])
        })

        it("prices lines at the upstream price when the handler returns nothing", async () => {
          additionsFor = () => undefined
          const cart = await createCart()

          const response = await addLine(cart.id, { metadata: engraved })

          expect(response.status).toEqual(200)
          expect(response.data.cart.items).toEqual([
            expect.objectContaining({ unit_price: 1500, is_custom_price: false }),
          ])
        })
      })
    })
  },
})

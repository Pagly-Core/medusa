import {
  IStoreCreditModuleService,
  PluginModule,
} from "@medusajs/loyalty-plugin/types"
import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  adminHeaders,
  createAdminUser,
} from "../../../../helpers/create-admin-user"

jest.setTimeout(60 * 1000)

// Pagly: balances are read for many accounts at once (gift card lists,
// customer lists), so they come from one grouped ledger query rather than one
// query per account. An account's metadata can be updated; its owner and
// currency never change.
medusaIntegrationTestRunner({
  testSuite: ({ dbConnection, api, getContainer, dbUtils }) => {
    let accounts

    beforeAll(async () => {
      await createAdminUser(dbConnection, adminHeaders, getContainer())

      accounts = []
      for (const [credit, debit] of [
        [500, 0],
        [300, 120],
        [80, 80],
      ]) {
        const account = (
          await api.post(
            `/admin/store-credit-accounts`,
            { currency_code: "usd" },
            adminHeaders
          )
        ).data.store_credit_account

        await api.post(
          `/admin/store-credit-accounts/${account.id}/credit`,
          { amount: credit },
          adminHeaders
        )

        if (debit) {
          await api.post(
            `/admin/store-credit-accounts/${account.id}/debit`,
            { amount: debit },
            adminHeaders
          )
        }

        accounts.push(account)
      }

      await dbUtils.snapshot()
    })

    const storeCredit = () =>
      getContainer().resolve<IStoreCreditModuleService>(
        PluginModule.STORE_CREDIT
      )

    describe("balances", () => {
      it("lists accounts with their balances from one grouped read", async () => {
        const service = storeCredit()
        const perAccount = jest.spyOn(service, "retrieveAccountStats")

        try {
          const listed = await service.listStoreCreditAccounts({
            id: accounts.map((account) => account.id),
          })

          const byId = Object.fromEntries(
            listed.map((account) => [account.id, account])
          )

          expect(byId[accounts[0].id]).toEqual(
            expect.objectContaining({ balance: 500, credits: 500, debits: 0 })
          )
          expect(byId[accounts[1].id]).toEqual(
            expect.objectContaining({ balance: 180, credits: 300, debits: 120 })
          )
          expect(byId[accounts[2].id]).toEqual(
            expect.objectContaining({ balance: 0, credits: 80, debits: 80 })
          )
          expect(perAccount).not.toHaveBeenCalled()
        } finally {
          perAccount.mockRestore()
        }
      })

      it("returns each gift card's balance on the admin list", async () => {
        const giftCard = (
          await api.post(
            `/admin/gift-cards`,
            { currency_code: "usd", value: 700, code: "LIST-0001" },
            adminHeaders
          )
        ).data.gift_card

        const { gift_cards } = (
          await api.get(
            `/admin/gift-cards?id=${giftCard.id}&fields=id,code,+store_credit_account.balance`,
            adminHeaders
          )
        ).data

        expect(gift_cards).toEqual([
          expect.objectContaining({
            id: giftCard.id,
            store_credit_account: expect.objectContaining({ balance: 700 }),
          }),
        ])
      })
    })

    describe("updateStoreCreditAccounts", () => {
      it("updates an account's metadata", async () => {
        const service = storeCredit()

        await service.updateStoreCreditAccounts({
          id: accounts[0].id,
          metadata: { label: "Devolución" },
        })

        const [updated] = await service.listStoreCreditAccounts({
          id: accounts[0].id,
        })
        expect(updated.metadata).toEqual({ label: "Devolución" })
      })

      it("refuses to move an account to another customer or currency", async () => {
        const service = storeCredit()

        await expect(
          service.updateStoreCreditAccounts({
            id: accounts[0].id,
            customer_id: "cus_someone_else",
          } as any)
        ).rejects.toThrow(/customer_id/)

        await expect(
          service.updateStoreCreditAccounts({
            id: accounts[0].id,
            currency_code: "eur",
          } as any)
        ).rejects.toThrow(/currency_code/)
      })
    })
  },
})

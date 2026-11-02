import { ICustomerModuleService } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { moduleIntegrationTestRunner } from "@medusajs/test-utils"

jest.setTimeout(30000)

/**
 * Pagly: what `GET /admin/customers?email_subscribed=` asks the module for
 * (packages/medusa/src/api/admin/customers/email-subscribed-filter.ts). The
 * consent is @pagly/storefront's `metadata.email_marketing`, and the cloud's
 * SQL proxy allows JSON operators but not `jsonb_*` functions.
 */
const SUBSCRIBED = { metadata: { email_marketing: { state: "subscribed" } } }
const NOT_SUBSCRIBED = {
  $or: [
    { metadata: { email_marketing: { state: { $ne: "subscribed" } } } },
    { metadata: { email_marketing: { state: null } } },
  ],
}

const consent = (state: "subscribed" | "unsubscribed") => ({
  state,
  opt_in_level: "single_opt_in",
  consent_updated_at: "2026-11-02T10:00:00.000Z",
  source: "newsletter",
})

const emails = (customers: { email?: string | null }[]) =>
  customers.map((customer) => customer.email).sort()

moduleIntegrationTestRunner<ICustomerModuleService>({
  moduleName: Modules.CUSTOMER,
  testSuite: ({ service, medusaApp }) => {
    describe("Customers by email marketing consent", () => {
      beforeEach(async () => {
        await service.createCustomers([
          {
            email: "ana@example.com",
            metadata: { email_marketing: consent("subscribed") },
          },
          {
            email: "bruno@example.com",
            metadata: { email_marketing: consent("unsubscribed") },
          },
          { email: "carla@example.com" },
          { email: "diego@example.com", metadata: { vip: true } },
          { email: "eva@example.com", metadata: { email_marketing: "yes" } },
        ])
      })

      it("lists only subscribed customers", async () => {
        const customers = await service.listCustomers(
          { $and: [SUBSCRIBED] },
          { select: ["email"] }
        )

        expect(emails(customers)).toEqual(["ana@example.com"])
      })

      it("lists unsubscribed, never asked and unreadable consents as not subscribed", async () => {
        const customers = await service.listCustomers(
          { $and: [NOT_SUBSCRIBED] },
          { select: ["email"] }
        )

        expect(emails(customers)).toEqual([
          "bruno@example.com",
          "carla@example.com",
          "diego@example.com",
          "eva@example.com",
        ])
      })

      it("counts through query.graph, as the admin list does", async () => {
        const { data, metadata } = await medusaApp.query.graph({
          entity: "customer",
          fields: ["email"],
          filters: { $and: [SUBSCRIBED], has_account: false },
          pagination: { skip: 0, take: 20 },
        })

        expect(emails(data)).toEqual(["ana@example.com"])
        expect(metadata.count).toBe(1)
      })

      it("asks Postgres with JSON operators only", async () => {
        const connection = medusaApp.sharedContainer.resolve(
          ContainerRegistrationKeys.PG_CONNECTION
        )
        const queries: string[] = []
        const listen = (query: { sql: string }) => queries.push(query.sql)

        connection.on("query", listen)
        try {
          await service.listCustomers({ $and: [SUBSCRIBED] })
          await service.listCustomers({ $and: [NOT_SUBSCRIBED] })
        } finally {
          connection.off("query", listen)
        }

        const sql = queries.join("\n")

        expect(sql).toContain(`"metadata"->'email_marketing'->>'state'`)
        expect(sql).not.toMatch(/jsonb?_[a-z_]+\s*\(/i)
      })
    })
  },
})

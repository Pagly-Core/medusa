import { zodValidator } from "@medusajs/framework"
import { applyEmailSubscribedFilter } from "../email-subscribed-filter"
import { adminCustomerRoutesMiddlewares } from "../middlewares"
import { AdminCustomersParams } from "../validators"

// Pagly: the customers list filters on the email marketing consent that
// @pagly/storefront keeps in `metadata.email_marketing.state`. The module
// spec `email-marketing-filter.spec.ts` in packages/modules/customer runs
// these same conditions against Postgres.
const SUBSCRIBED = { metadata: { email_marketing: { state: "subscribed" } } }
const NOT_SUBSCRIBED = {
  $or: [
    { metadata: { email_marketing: { state: { $ne: "subscribed" } } } },
    { metadata: { email_marketing: { state: null } } },
  ],
}

const filter = (filterableFields: Record<string, unknown>) => {
  const req = { filterableFields } as any
  const next = jest.fn()

  applyEmailSubscribedFilter(req, {} as any, next)

  return { filterableFields: req.filterableFields, next }
}

const middlewareNames = (method: string, matcher: string) =>
  adminCustomerRoutesMiddlewares
    .find(
      (route) =>
        route.matcher === matcher &&
        ([] as string[]).concat(route.method ?? []).includes(method)
    )
    ?.middlewares?.map((middleware) => middleware.name)

describe("customers list email_subscribed param", () => {
  it("is accepted as a boolean string", async () => {
    await expect(
      zodValidator(AdminCustomersParams, { email_subscribed: "true" })
    ).resolves.toMatchObject({ email_subscribed: true })
    await expect(
      zodValidator(AdminCustomersParams, { email_subscribed: "false" })
    ).resolves.toMatchObject({ email_subscribed: false })
  })

  it("rejects anything but true or false", async () => {
    await expect(
      zodValidator(AdminCustomersParams, { email_subscribed: "maybe" })
    ).rejects.toThrow("Invalid request")
  })

  it("lists only customers whose consent is subscribed", () => {
    const { filterableFields, next } = filter({
      has_account: true,
      email_subscribed: true,
    })

    expect(filterableFields).toEqual({
      has_account: true,
      $and: [SUBSCRIBED],
    })
    expect(next).toHaveBeenCalledWith()
  })

  it("lists unsubscribed and never asked customers as not subscribed", () => {
    const { filterableFields, next } = filter({ email_subscribed: false })

    expect(filterableFields).toEqual({ $and: [NOT_SUBSCRIBED] })
    expect(next).toHaveBeenCalledWith()
  })

  it("keeps the caller's own $and and $or", () => {
    const { filterableFields } = filter({
      $and: [{ has_account: true }],
      $or: [{ email: "ana@example.com" }, { email: "bruno@example.com" }],
      email_subscribed: true,
    })

    expect(filterableFields).toEqual({
      $and: [{ has_account: true }, SUBSCRIBED],
      $or: [{ email: "ana@example.com" }, { email: "bruno@example.com" }],
    })
  })

  it("leaves a list without the param as it was", () => {
    const { filterableFields, next } = filter({ has_account: false })

    expect(filterableFields).toEqual({ has_account: false })
    expect(next).toHaveBeenCalledWith()
  })

  it("runs right after the query is validated, on the list and the export", () => {
    for (const [method, matcher] of [
      ["GET", "/admin/customers"],
      ["POST", "/admin/customers/export"],
    ]) {
      const names = middlewareNames(method, matcher) ?? []

      expect(names).toContain("applyEmailSubscribedFilter")
      expect(names.indexOf("applyEmailSubscribedFilter")).toBe(
        names.lastIndexOf("validateQuery") + 1
      )
    }
  })
})

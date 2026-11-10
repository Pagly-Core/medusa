import { afterEach, describe, expect, it } from "vitest"
import { formatProvider, providerLogo } from "../format-provider"

describe("formatProvider", () => {
  it("formats the provider name and its type", () => {
    expect(formatProvider("pp_stripe-blik_dkk")).toBe("Stripe Blik (DKK)")
    expect(formatProvider("pp_system_default")).toBe("System (DEFAULT)")
  })

  it("formats a provider without a type", () => {
    expect(formatProvider("manual_manual")).toBe("Manual")
  })

  it("keeps identifiers that contain underscores intact", () => {
    expect(formatProvider("pp_medusa-payments_acct_1S8eRlDAQUIGJhSY")).toBe(
      "Medusa Payments (acct_1S8eRlDAQUIGJhSY)"
    )
  })

  it("returns IDs that don't follow the provider format as they are", () => {
    expect(formatProvider("custom")).toBe("custom")
  })
})

// Pagly: a plugin registers how its providers read (a carrier's brand) on
// globalThis.__paglyProviderLooks, as it registers the media picker.
describe("a provider a plugin names", () => {
  const looks = () => globalThis as Record<string, unknown>

  afterEach(() => {
    delete looks().__paglyProviderLooks
  })

  it("reads by the name and logo the plugin gives it", () => {
    looks().__paglyProviderLooks = { ues_ues: { name: "UES", logo: "/assets/ues.png" } }
    expect(formatProvider("ues_ues")).toBe("UES")
    expect(providerLogo("ues_ues")).toBe("/assets/ues.png")
  })

  it("reads as before without one", () => {
    expect(formatProvider("ues_ues")).toBe("Ues")
    expect(providerLogo("ues_ues")).toBeNull()
    looks().__paglyProviderLooks = { ues_ues: { name: "UES" } }
    expect(formatProvider("manual_manual")).toBe("Manual")
    expect(providerLogo("ues_ues")).toBeNull()
  })
})

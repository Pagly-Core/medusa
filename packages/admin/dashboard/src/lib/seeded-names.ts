import type { TFunction } from "i18next"

/**
 * Pagly: rows Medusa seeds carry English names as data ("Default Shipping
 * Profile", "Default Sales Channel", the "Standard" shipping option type).
 * On the cloud they belong to the platform and every store shares them, so a
 * store cannot rename them. Screens show them in the admin's language; a name
 * the merchant chose is shown as written.
 */
const SEEDED_NAMES: Record<string, string> = {
  "default shipping profile": "defaultNames.shippingProfile",
  "default sales channel": "defaultNames.salesChannel",
}

type Translate = TFunction | ((key: string) => string)

const normalized = (value?: string | null) => (value ?? "").trim().toLowerCase()

/** A shipping profile's or sales channel's name, translated when Medusa seeded it. */
export const seededName = (t: Translate, name?: string | null): string => {
  const key = SEEDED_NAMES[normalized(name)]
  return key ? (t as (key: string) => string)(key) : name ?? ""
}

type Channel = { name?: string | null; description?: string | null }

/**
 * Pagly: whether a channel is the one Medusa seeds, with the description it
 * seeds ("Created by …", the engine's name).
 */
const isSeededChannel = (channel?: Channel | null) =>
  normalized(channel?.name) === "default sales channel" &&
  normalized(channel?.description).startsWith("created by ")

/**
 * Pagly: a sales channel's description, "Your online store" in the admin's
 * language for the one Medusa seeds (Pagly-Core/pagly-app#237).
 */
export const seededDescription = (
  t: Translate,
  channel?: Channel | null
): string =>
  isSeededChannel(channel)
    ? (t as (key: string) => string)("defaultNames.salesChannelDescription")
    : channel?.description ?? ""

type OptionType = {
  code?: string | null
  label?: string | null
  description?: string | null
}

const isSeededStandard = (type?: OptionType | null) =>
  normalized(type?.code) === "standard" && normalized(type?.label) === "standard"

/** A shipping option type's label, translated for the seeded "Standard" one. */
export const shippingOptionTypeLabel = (
  t: Translate,
  type?: OptionType | null
): string =>
  isSeededStandard(type)
    ? (t as (key: string) => string)("defaultNames.shippingOptionType.label")
    : type?.label ?? ""

/** A shipping option type's description, translated for the seeded "Standard" one. */
export const shippingOptionTypeDescription = (
  t: Translate,
  type?: OptionType | null
): string =>
  isSeededStandard(type) &&
  normalized(type?.description) === "standard delivery"
    ? (t as (key: string) => string)(
        "defaultNames.shippingOptionType.description"
      )
    : type?.description ?? ""

/** A row with its seeded name shown in the admin's language. */
export const withSeededName = <T extends { name?: string | null }>(
  t: Translate,
  row: T
): T => {
  const name = seededName(t, row.name)
  return name === (row.name ?? "") ? row : { ...row, name }
}

/** A sales channel with its seeded name and description in the admin's language. */
export const withSeededChannel = <T extends Channel>(t: Translate, row: T): T => {
  const named = withSeededName(t, row)
  return isSeededChannel(row)
    ? { ...named, description: seededDescription(t, row) }
    : named
}

/** A shipping option type with its seeded label and description translated. */
export const withSeededOptionType = <T extends OptionType>(
  t: Translate,
  type: T
): T =>
  isSeededStandard(type)
    ? {
        ...type,
        label: shippingOptionTypeLabel(t, type),
        description: shippingOptionTypeDescription(t, type),
      }
    : type

import { HttpTypes } from "@medusajs/types"

export function isReturnOption(shippingOption: HttpTypes.AdminShippingOption) {
  return !!shippingOption.rules?.find(
    (r) =>
      r.attribute === "is_return" && r.value === "true" && r.operator === "eq"
  )
}

export function isOptionEnabledInStore(
  shippingOption: HttpTypes.AdminShippingOption
) {
  return !!shippingOption.rules?.find(
    (r) =>
      r.attribute === "enabled_in_store" &&
      r.value === "true" &&
      r.operator === "eq"
  )
}

/**
 * Return a name for the shipping option location or generate one based on the locations address
 */
export function getFormattedShippingOptionLocationName(
  shippingOption: HttpTypes.AdminShippingOption
) {
  const location = shippingOption.service_zone.fulfillment_set.location

  if (!location) {
    return "N/A"
  }

  if (location.name) {
    return `${location.name}`
  }

  let name = ""

  if (location.address) {
    if (location.address.address_1) {
      name += `${location.address.address_1}`
    }

    if (location.address.address_2) {
      name += `${location.address.address_2}`
    }

    if (location.address.city) {
      name += `${location.address.city}`
    }

    if (location.address.postal_code) {
      name += `${location.address.postal_code}`
    }

    if (location.address.country_code) {
      name += `, ${location.address.country_code}`
    }
  }

  return name || "N/A"
}

/**
 * Pagly: whether checkout offers a shipping option. The fulfillment module
 * offers one with no rules, and otherwise checks its rules against
 * `enabled_in_store: "true"`, so only a rule that fails it hides the option.
 */
export function isOptionShownInStore(
  shippingOption: Pick<HttpTypes.AdminShippingOption, "rules">
) {
  return (shippingOption.rules ?? []).every((rule) => {
    if (rule.attribute !== "enabled_in_store") {
      return true
    }
    const values = ([] as unknown[]).concat(rule.value).map(String)
    switch (rule.operator) {
      case "eq":
        return values[0] === "true"
      case "ne":
        return values[0] !== "true"
      case "in":
        return values.includes("true")
      case "nin":
        return !values.includes("true")
      default:
        return true
    }
  })
}

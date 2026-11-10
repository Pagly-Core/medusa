import { provinceName } from "@medusajs/dashboard/lib"
import { HttpTypes } from "@medusajs/types"
import { getCountryByIso2 } from "../data/countries"

export function isSameAddress(
  a?: HttpTypes.AdminOrderAddress | null,
  b?: HttpTypes.AdminOrderAddress | null
) {
  if (!a || !b) {
    return false
  }

  return (
    a.first_name === b.first_name &&
    a.last_name === b.last_name &&
    a.address_1 === b.address_1 &&
    a.address_2 === b.address_2 &&
    a.city === b.city &&
    a.postal_code === b.postal_code &&
    a.province === b.province &&
    a.country_code === b.country_code &&
    a.phone === b.phone &&
    a.company === b.company
  )
}

/**
 * Pagly: a country's name in `language`, from the browser's region names,
 * falling back to the English name on the plugin's country list.
 */
const regionNames = new Map<string, Intl.DisplayNames>()

export function getCountryName(iso2: string, language: string) {
  const code = iso2.toUpperCase()

  try {
    if (!regionNames.has(language)) {
      regionNames.set(
        language,
        new Intl.DisplayNames([language], { type: "region" })
      )
    }
    const name = regionNames.get(language)!.of(code)

    if (name && name !== code) {
      return name
    }
  } catch {
    // An unknown language or region falls through to the list.
  }

  return getCountryByIso2(iso2)?.display_name ?? code
}

export function getFormattedAddress(
  address?: HttpTypes.AdminOrderAddress | HttpTypes.AdminCustomerAddress | null,
  language = "en"
) {
  if (!address) {
    return []
  }

  const {
    first_name,
    last_name,
    company,
    address_1,
    address_2,
    city,
    postal_code,
    province,
    country_code,
  } = address

  const country = "country" in address ? address.country : null

  const name = [first_name, last_name].filter(Boolean).join(" ")

  const formattedAddress: string[] = []

  if (name) {
    formattedAddress.push(name)
  }

  if (company) {
    formattedAddress.push(company)
  }

  if (address_1) {
    formattedAddress.push(address_1)
  }

  if (address_2) {
    formattedAddress.push(address_2)
  }

  // Pagly: a province saved by its code reads by its name, like the order page.
  const cityProvincePostal = [city, province && provinceName(province), postal_code]
    .filter(Boolean)
    .join(" ")

  if (cityProvincePostal) {
    formattedAddress.push(cityProvincePostal)
  }

  // Pagly: the country is named in the admin's language.
  const countryCode = country?.iso_2 ?? country_code

  if (countryCode) {
    formattedAddress.push(getCountryName(countryCode, language))
  } else if (country?.display_name) {
    formattedAddress.push(country.display_name)
  }

  return formattedAddress
}

import i18n from "i18next"
import { z } from "zod"

const isEmpty = (input: unknown) =>
  input === undefined || input === null || input === ""

/**
 * Pagly: every validation message in the admin's language, read from the
 * catalogs when a form is checked. Without it a bare `.min(1)` said zod's own
 * English ("Invalid input", "Too small: …") (Pagly-Core/pagly-app#356).
 * A schema's own message still wins: zod asks this map only when there is none.
 */
export const paglyZodErrorMap: z.core.$ZodErrorMap = (issue) => {
  switch (issue.code) {
    // A missing value through a union (a number or a text) is required too.
    case "invalid_union":
    case "invalid_type":
      return isEmpty(issue.input)
        ? i18n.t("validation.required")
        : i18n.t("validation.invalid")
    case "too_small": {
      const min = Number(issue.minimum)
      if (issue.origin === "number" || issue.origin === "bigint") {
        return issue.inclusive === false
          ? i18n.t("validation.above", { min })
          : i18n.t("validation.atLeast", { min })
      }
      if (min <= 1 && (issue.origin === "string" || issue.origin === "array")) {
        return i18n.t("validation.required")
      }
      if (issue.origin === "string") {
        return i18n.t("validation.minLength", { min })
      }
      return i18n.t("validation.invalid")
    }
    case "too_big": {
      const max = Number(issue.maximum)
      if (issue.origin === "number" || issue.origin === "bigint") {
        return issue.inclusive === false
          ? i18n.t("validation.below", { max })
          : i18n.t("validation.atMost", { max })
      }
      if (issue.origin === "string") {
        return i18n.t("validation.maxLength", { max })
      }
      return i18n.t("validation.invalid")
    }
    case "invalid_format":
      return issue.format === "email"
        ? i18n.t("validation.invalidEmail")
        : i18n.t("validation.invalid")
    default:
      return i18n.t("validation.invalid")
  }
}

/** Pagly: installs `paglyZodErrorMap` for every schema the admin parses. */
export const installZodErrorMap = () => {
  z.config({ customError: paglyZodErrorMap })
}

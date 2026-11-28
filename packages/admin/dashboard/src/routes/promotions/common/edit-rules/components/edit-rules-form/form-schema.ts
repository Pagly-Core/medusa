import i18n from "i18next"
import { z } from "zod"

// Pagly: read when the form is checked, not when the module loads, before
// i18next has a language (Pagly-Core/pagly-app#267).
const required = () => i18n.t("promotions.form.required")

export const EditRules = z.object({
  type: z.string().optional(),
  rules: z.array(
    z.object({
      id: z.string().optional(),
      attribute: z.string().min(1, { error: required }),
      operator: z.string().min(1, { error: required }),
      values: z.union([
        z.number().min(1, { error: required }),
        z.string().min(1, { error: required }),
        z.array(z.string()).min(1, { error: required }),
      ]),
      required: z.boolean().optional(),
      disguised: z.boolean().optional(),
      field_type: z.string().optional(),
    })
  ),
  application_method: z.object({
    target_type: z.enum(["order", "shipping_methods", "items"]),
  }),
})

export type EditRulesType = z.infer<typeof EditRules>

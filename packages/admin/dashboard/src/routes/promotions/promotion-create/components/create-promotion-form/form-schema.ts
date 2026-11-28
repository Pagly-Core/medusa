import i18n from "i18next"
import { z } from "zod"
import { CreateCampaignSchema } from "../../../../campaigns/campaign-create/components/create-campaign-form"

/**
 * Pagly: whether a promotion's value is a percentage the server refuses:
 * 0 or less, or above 100 (Pagly-Core/pagly-app#356). Create and edit both
 * check it.
 */
export const percentageOutOfRange = (type: string | undefined, value: number) =>
  type === "percentage" && (!(value > 0) || value > 100)

const RuleSchema = z.array(
  z.object({
    id: z.string().optional(),
    attribute: z.string().min(1, { message: "Required field" }),
    operator: z.string().min(1, { message: "Required field" }),
    values: z.union([
      z.number().min(1, { message: "Required field" }),
      z.string().min(1, { message: "Required field" }),
      z.array(z.string()).min(1, { message: "Required field" }),
    ]),
    required: z.boolean().optional(),
    disguised: z.boolean().optional(),
    field_type: z.string().optional(),
  })
)

export const CreatePromotionSchema = z
  .object({
    template_id: z.string().optional(),
    campaign_id: z.string().optional(),
    campaign_choice: z.enum(["none", "existing", "new"]).optional(),
    is_automatic: z.string().toLowerCase(),
    code: z.string().min(1),
    type: z.enum(["buyget", "standard"]),
    status: z.enum(["draft", "active", "inactive"]),
    rules: RuleSchema,
    is_tax_inclusive: z.boolean().optional(),
    limit: z.number().int().min(1).nullable().optional(),
    application_method: z.object({
      allocation: z.enum(["each", "across", "once"]),
      value: z.number().min(0).or(z.string().min(1)),
      currency_code: z.string().optional(),
      max_quantity: z.number().optional().nullable(),
      target_rules: RuleSchema,
      buy_rules: RuleSchema,
      type: z.enum(["fixed", "percentage"]),
      target_type: z.enum(["order", "shipping_methods", "items"]),
    }),
    campaign: CreateCampaignSchema.optional(),
  })
  .refine(
    (data) => {
      if (data.application_method.allocation === "across") {
        return true
      }

      return (
        (data.application_method.allocation === "each" ||
          data.application_method.allocation === "once") &&
        typeof data.application_method.max_quantity === "number"
      )
    },
    {
      path: ["application_method.max_quantity"],
      message: `required field`,
    }
  )

  // Pagly: a percentage off takes above 0 and up to 100 (Pagly-Core/pagly-app#356).
  .refine(
    (data) =>
      !percentageOutOfRange(
        data.application_method.type,
        Number(data.application_method.value)
      ),
    {
      path: ["application_method", "value"],
      // Read when it is checked, so it is in the admin's language.
      error: () => i18n.t("promotions.errors.percentageUpTo100"),
    }
  )

export type CreatePromotionSchemaType = z.infer<typeof CreatePromotionSchema>

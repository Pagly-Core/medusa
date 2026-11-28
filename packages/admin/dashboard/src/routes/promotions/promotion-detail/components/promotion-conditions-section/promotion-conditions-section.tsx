import { PencilSquare } from "@medusajs/icons"
import { ApplicationMethodTargetTypeValues } from "@medusajs/types"
import { Badge, Container, Heading } from "@medusajs/ui"
import { useTranslation } from "react-i18next"

import { ActionMenu } from "../../../../../components/common/action-menu"
import { BadgeListSummary } from "../../../../../components/common/badge-list-summary"
import { NoRecords } from "../../../../../components/common/empty-table-content"
import { ExtendedPromotionRule } from "../../promotion-detail"

type RuleProps = {
  rule: ExtendedPromotionRule
}

function RuleBlock({ rule }: RuleProps) {
  return (
    <div className="bg-ui-bg-subtle shadow-borders-base align-center flex justify-around rounded-md p-2">
      <div className="text-ui-fg-subtle txt-compact-xsmall flex items-center whitespace-nowrap">
        <Badge
          size="2xsmall"
          key="rule-attribute"
          className="txt-compact-xsmall-plus tag-neutral-text mx-1 inline-block truncate"
        >
          {rule.attribute_label}
        </Badge>

        <span className="txt-compact-2xsmall mx-1 inline-block">
          {rule.operator_label}
        </span>

        <BadgeListSummary
          inline
          className="!txt-compact-small-plus"
          list={
            (rule.field_type === "number"
              ? [rule.values]
              : rule.values?.map((v) => v.label) || []
            ).filter(Boolean) as string[]
          }
        />
      </div>
    </div>
  )
}

export type PromotionConditionsSectionProps = {
  rules: ExtendedPromotionRule[]
  ruleType: string
  applicationMethodTargetType?: ApplicationMethodTargetTypeValues
}

export const PromotionConditionsSection = ({
  rules,
  ruleType,
  applicationMethodTargetType,
}: PromotionConditionsSectionProps) => {
  const { t } = useTranslation()

  // Pagly: the empty text names what the conditions restrict; it said items
  // for every kind, under "Who can use this code?" too (Pagly-Core/pagly-app#356).
  const emptyMessage =
    ruleType === "rules"
      ? t("promotions.conditions.list.noRecordsRulesMessage")
      : ruleType === "buy-rules"
        ? t("promotions.conditions.list.noRecordsBuyMessage")
        : applicationMethodTargetType === "shipping_methods"
          ? t("promotions.conditions.list.noRecordsShippingMessage")
          : t("promotions.conditions.list.noRecordsMessage")

  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex flex-col">
          <Heading level="h2">
            {(t as any)(
              ruleType === "target-rules"
                ? `promotions.fields.conditions.${ruleType}.${applicationMethodTargetType}.title`
                : `promotions.fields.conditions.${ruleType}.title`
            )}
          </Heading>
        </div>

        <ActionMenu
          groups={[
            {
              actions: [
                {
                  icon: <PencilSquare />,
                  label: t("actions.edit"),
                  to: `${ruleType}/edit`,
                },
              ],
            },
          ]}
        />
      </div>

      <div className="text-ui-fg-subtle flex flex-col gap-2 px-6 pb-4 pt-2">
        {!rules.length && (
          <NoRecords
            className="h-[180px]"
            title={t("general.noRecordsTitle")}
            message={emptyMessage}
            action={{
              to: `${ruleType}/edit`,
              label: t("promotions.conditions.add"),
            }}
            buttonVariant="transparentIconLeft"
          />
        )}

        {rules.map((rule) => (
          <RuleBlock key={`${rule.id}-${rule.attribute}`} rule={rule} />
        ))}
      </div>
    </Container>
  )
}

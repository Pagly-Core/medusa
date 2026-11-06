import {
  AdditionalData,
  CartDTO,
  CustomerDTO,
  RegionDTO,
  UpdateLineItemInCartWorkflowInputDTO,
} from "@medusajs/framework/types"
import {
  CartWorkflowEvents,
  deduplicate,
  filterObjectByKeys,
  isDefined,
  isPresent,
  MathBN,
  MedusaError,
  mergeMetadata,
  PriceListType,
  QueryContext,
} from "@medusajs/framework/utils"
import {
  createHook,
  createStep,
  createWorkflow,
  parallelize,
  StepResponse,
  transform,
  when,
  WorkflowData,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { useQueryGraphStep } from "../../common"
import { emitEventStep } from "../../common/steps/emit-event"
import { deleteLineItemsWorkflow } from "../../line-item"
import { updateLineItemsStepWithSelector } from "../../line-item/steps"
import { acquireLockStep, releaseLockStep } from "../../locking"
import { validateCartStep } from "../steps/validate-cart"
import { validateVariantPricesStep } from "../steps/validate-variant-prices"
import {
  cartFieldsForPricingContext,
  productVariantsFields,
} from "../utils/fields"
import { requiredVariantFieldsForInventoryConfirmation } from "../utils/prepare-confirm-inventory-input"
import {
  pricingContextResult,
  unitPriceAdditionsResult,
} from "../utils/schemas"
import {
  UnitPriceAdditionsHookItem,
  withUnitPriceAddition,
} from "../utils/unit-price-addition"
import { confirmVariantInventoryWorkflow } from "./confirm-variant-inventory"
import { refreshCartItemsWorkflow } from "./refresh-cart-items"

const cartFields = cartFieldsForPricingContext.concat(["items.*"])
const variantFields = deduplicate(
  productVariantsFields.concat([
    "calculated_price.*",
    ...requiredVariantFieldsForInventoryConfirmation
  ])
)

interface CartQueryDTO extends Omit<CartDTO, "items"> {
  items: NonNullable<CartDTO["items"]>
  customer: CustomerDTO
  region: RegionDTO
}

interface FindLineItemToUpdateStepInput {
  cart: CartQueryDTO
  input: UpdateLineItemInCartWorkflowInputDTO & AdditionalData
}

/**
 * This step finds the line item to update in the cart and collects its variant
 * id. It throws an error if the line item isn't found in the cart.
 */
export const findLineItemToUpdateStep = createStep(
  "find-line-item-to-update",
  async ({ cart, input }: FindLineItemToUpdateStepInput) => {
    const item = cart.items.find((i) => i.id === input.item_id)
    if (!item) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        `Line item with id: ${input.item_id} was not found`
      )
    }

    const variantIds = [item.variant_id].filter(Boolean)
    return new StepResponse({ item, variantIds })
  }
)

interface PrepareLineItemUpdateStepInput {
  input: UpdateLineItemInCartWorkflowInputDTO & AdditionalData
  variants: any
  item: CartQueryDTO["items"][number]
  /**
   * Pagly: the `setUnitPriceAdditions` hook's result for the line.
   */
  unitPriceAdditions?: number[]
}

/**
 * This step builds the update payload for a cart line item, resolving its unit
 * price (from the input, the variant's calculated price, or the existing item),
 * its compare-at unit price, and tax inclusivity. It throws an error if the
 * resulting unit price is unset.
 */
export const prepareLineItemUpdateStep = createStep(
  "prepare-line-item-update",
  async ({
    input,
    variants,
    item,
    unitPriceAdditions,
  }: PrepareLineItemUpdateStepInput) => {
    const variant = variants?.[0] ?? undefined

    const updateData: Record<string, any> = {
      ...input.update,
      unit_price: isDefined(input.update.unit_price)
        ? input.update.unit_price
        : item.unit_price,
      is_custom_price: isDefined(input.update.unit_price)
        ? true
        : item.is_custom_price,
      is_tax_inclusive:
        item.is_tax_inclusive ||
        variant?.calculated_price?.is_calculated_price_tax_inclusive,
    }

    if (variant && !updateData.is_custom_price) {
      // Pagly: the hook's per-unit amount (Personalización add-ons) is added
      // to the price and to the sale compare-at price.
      const calculatedPrice = withUnitPriceAddition(
        variant.calculated_price,
        unitPriceAdditions?.[0]
      )

      updateData.unit_price = calculatedPrice.calculated_amount

      // The compare-at price is hydrated the same way the create path does it,
      // so that the applied sale price is visible regardless of which path
      // produced the line item.
      if (!isDefined(input.update.compare_at_unit_price)) {
        const isSalePrice =
          calculatedPrice?.calculated_price?.price_list_type ===
          PriceListType.SALE

        updateData.compare_at_unit_price =
          isSalePrice &&
          !MathBN.eq(
            calculatedPrice?.original_amount,
            calculatedPrice?.calculated_amount
          )
            ? calculatedPrice.original_amount
            : null
      }
    }

    if (!isDefined(updateData.unit_price)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Line item ${item.title} has no unit price`
      )
    }

    return new StepResponse({
      data: updateData,
      selector: {
        id: input.item_id,
      },
    })
  }
)

export const updateLineItemInCartWorkflowId = "update-line-item-in-cart"
/**
 * This workflow updates a line item's details in a cart. You can update the line item's quantity, unit price, and more.
 * If the quantity is set to 0, the item will be removed from the cart.
 * This workflow is executed by the [Update Line Item Store API Route](https://docs.medusajs.com/api/store/carts/update-line-item).
 *
 * You can use this workflow within your own customizations or custom workflows, allowing you to update a line item's details in your custom flows.
 *
 * @example
 * const { result } = await updateLineItemInCartWorkflow(container)
 * .run({
 *   input: {
 *     cart_id: "cart_123",
 *     item_id: "item_123",
 *     update: {
 *       quantity: 2
 *     }
 *   }
 * })
 *
 * @summary
 *
 * Update a cart's line item.
 *
 * @property hooks.validate - This hook is executed before all operations. You can consume this hook to perform any custom validation. If validation fails, you can throw an error to stop the workflow execution.
 * @property hooks.setPricingContext - This hook is executed before the cart is updated. You can consume this hook to return any custom context useful for the prices retrieval of the line item's variant.
 *
 * For example, assuming you have the following custom pricing rule:
 *
 * ```json
 * {
 *   "attribute": "location_id",
 *   "operator": "eq",
 *   "value": "sloc_123",
 * }
 * ```
 *
 * You can consume the `setPricingContext` hook to add the `location_id` context to the prices calculation:
 *
 * ```ts
 * import { addToCartWorkflow } from "@medusajs/medusa/core-flows";
 * import { StepResponse } from "@medusajs/workflows-sdk";
 *
 * addToCartWorkflow.hooks.setPricingContext((
 *   { cart, variantIds, items, additional_data }, { container }
 * ) => {
 *   return new StepResponse({
 *     location_id: "sloc_123", // Special price for in-store purchases
 *   });
 * });
 * ```
 *
 * The variant's prices will now be retrieved using the context you return.
 *
 * :::note
 *
 * Learn more about prices calculation context in the [Prices Calculation](https://docs.medusajs.com/resources/commerce-modules/pricing/price-calculation) documentation.
 *
 * :::
 *
 * @property hooks.setUnitPriceAdditions - Pagly: executed after the line item's variant is retrieved. It receives `{ currency_code, cart, items, variants }`, where `items` holds the line item with its updated quantity and metadata (empty when the update removes the line), and can return one non-negative amount per item, in the cart's currency, added to the line item's unit price and sale compare-at price. A custom-priced line item ignores it.
 */
export const updateLineItemInCartWorkflow = createWorkflow(
  {
    name: updateLineItemInCartWorkflowId,
    idempotent: false,
  },
  (
    input: WorkflowData<UpdateLineItemInCartWorkflowInputDTO & AdditionalData>
  ) => {
    acquireLockStep({
      key: input.cart_id,
      timeout: 2,
      ttl: 10,
    })

    const { data: cart } = useQueryGraphStep({
      entity: "cart",
      filters: { id: input.cart_id },
      fields: cartFields,
      options: { throwIfKeyNotFound: true, isList: false },
    }).config({ name: "get-cart" })

    const { item, variantIds } = findLineItemToUpdateStep({ cart, input })

    validateCartStep({ cart })

    const validate = createHook("validate", {
      input,
      cart,
    })

    const setPricingContext = createHook(
      "setPricingContext",
      {
        cart,
        item,
        variantIds,
        additional_data: input.additional_data,
      },
      {
        resultValidator: pricingContextResult,
      }
    )

    const setPricingContextResult = setPricingContext.getResult()

    const pricingContext = transform(
      { cart, item, update: input.update, setPricingContextResult },
      (data): Record<string, any> => {
        return {
          ...filterObjectByKeys(data.cart, cartFieldsForPricingContext),
          ...(data.setPricingContextResult ? data.setPricingContextResult : {}),
          quantity: data.update.quantity ?? data.item.quantity,
          currency_code: data.cart.currency_code,
          region_id: data.cart.region_id!,
          region: data.cart.region!,
          customer_id: data.cart.customer_id!,
          customer: data.cart.customer!,
        }
      }
    )

    const shouldRemoveItem = transform(
      { input },
      ({ input }) =>
        !!(
          isDefined(input.update.quantity) &&
          MathBN.eq(input.update.quantity, 0)
        )
    )

    when(
      "should-remove-item",
      { shouldRemoveItem },
      ({ shouldRemoveItem }) => shouldRemoveItem
    ).then(() => {
      deleteLineItemsWorkflow.runAsStep({
        input: {
          cart_id: input.cart_id,
          ids: [input.item_id],
          additional_data: input.additional_data,
        },
      })
    })

    const variants = when(
      "should-fetch-variants",
      { variantIds, shouldRemoveItem },
      ({ variantIds, shouldRemoveItem }) => {
        return !!variantIds.length && !shouldRemoveItem
      }
    ).then(() => {
      const calculatedPriceQueryContext = transform(
        { pricingContext },
        ({ pricingContext }) => {
          return QueryContext(pricingContext)
        }
      )

      const { data: variants } = useQueryGraphStep({
        entity: "variants",
        fields: variantFields,
        filters: {
          id: variantIds,
        },
        context: {
          calculated_price: calculatedPriceQueryContext,
        },
      }).config({ name: "fetch-variants" })

      validateVariantPricesStep({ variants })

      return variants
    })

    // Pagly: lets a plugin add a per-unit amount to the line (Personalización
    // add-ons), as getVariantsAndItemsWithPrices does on the other cart paths.
    const unitPriceAdditionsInput = transform(
      { item, input, variants, shouldRemoveItem },
      ({
        item,
        input,
        variants,
        shouldRemoveItem,
      }): { items: UnitPriceAdditionsHookItem[]; variants: any[] } => {
        // A line being removed isn't priced, so a handler can't block removal.
        if (shouldRemoveItem) {
          return { items: [], variants: [] }
        }

        // The metadata the line will have once the update is stored: the
        // module merges a present metadata update into the line's metadata.
        const metadata = !isDefined(input.update.metadata)
          ? item.metadata
          : isPresent(input.update.metadata)
          ? mergeMetadata(item.metadata ?? {}, input.update.metadata!)
          : input.update.metadata

        return {
          items: [
            {
              ...item,
              quantity: input.update.quantity ?? item.quantity,
              metadata,
            },
          ],
          variants: variants ?? [],
        }
      }
    )

    const setUnitPriceAdditions = createHook(
      "setUnitPriceAdditions",
      {
        currency_code: cart.currency_code,
        cart,
        items: unitPriceAdditionsInput.items,
        variants: unitPriceAdditionsInput.variants,
      },
      {
        resultValidator: unitPriceAdditionsResult,
      }
    )

    const unitPriceAdditions = setUnitPriceAdditions.getResult()

    when(
      "should-update-item",
      { shouldRemoveItem },
      ({ shouldRemoveItem }) => !shouldRemoveItem
    ).then(() => {
      const items = transform({ input, item }, (data) => {
        return [
          Object.assign(data.item, { quantity: data.input.update.quantity }),
        ]
      })

      confirmVariantInventoryWorkflow.runAsStep({
        input: {
          sales_channel_id: pricingContext.sales_channel_id,
          variants,
          items,
        },
      })

      const lineItemUpdate = prepareLineItemUpdateStep({
        input,
        variants,
        item,
        unitPriceAdditions,
      })

      updateLineItemsStepWithSelector(lineItemUpdate)

      refreshCartItemsWorkflow.runAsStep({
        input: {
          cart_id: input.cart_id,
          additional_data: input.additional_data,
        },
      })
    })

    parallelize(
      releaseLockStep({
        key: input.cart_id,
      }),
      emitEventStep({
        eventName: CartWorkflowEvents.UPDATED,
        data: { id: input.cart_id },
      })
    )

    return new WorkflowResponse(void 0, {
      hooks: [validate, setPricingContext, setUnitPriceAdditions] as const,
    })
  }
)

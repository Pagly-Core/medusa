import { refreshCartItemsWorkflow } from "@medusajs/medusa/core-flows";
import { StepResponse } from "@medusajs/framework/workflows-sdk";
import { refreshCartGiftCardsWorkflow } from "../carts/workflows/refresh-cart-gift-cards";

/**
 * Before core refreshes a cart's payment collection (every add, update or
 * removal of a line), the cart's gift card and store credit lines are
 * rebuilt against its new total.
 */
export const refreshLoyaltyCreditLines = async (data, stepContext) => {
  const { container, ...sharedContext } = stepContext;

  const transaction = await refreshCartGiftCardsWorkflow.run({
    input: { cart_id: data.input.cart_id },
    container,
    context: { ...sharedContext },
  });

  const { result } = transaction;

  return new StepResponse(result, stepContext.transactionId);
};

export const cancelLoyaltyCreditLines = async (transactionId, stepContext) => {
  if (!transactionId) {
    return;
  }

  const { container, ...sharedContext } = stepContext;

  await refreshCartGiftCardsWorkflow(container).cancel({
    transactionId,
    container,
    context: { ...sharedContext },
  });
};

(refreshCartItemsWorkflow.hooks as any).beforeRefreshingPaymentCollection(
  refreshLoyaltyCreditLines,
  cancelLoyaltyCreditLines
);

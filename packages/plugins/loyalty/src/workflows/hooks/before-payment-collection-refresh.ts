import { refreshCartItemsWorkflow } from "@medusajs/medusa/core-flows";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { StepResponse } from "@medusajs/framework/workflows-sdk";
import { refreshCartGiftCardsWorkflow } from "../carts/workflows/refresh-cart-gift-cards";

/** The credit lines the gift card refresh deletes and builds again. */
const LOYALTY_REFERENCES = ["gift-card", "store-credit"];

type CartLoyalty = {
  gift_cards?: ({ id: string } | null)[] | null;
  credit_lines?: ({ reference?: string | null } | null)[] | null;
};

/**
 * Whether the refresh has anything to rebuild: a linked gift card (also a
 * spent or expired one, which the refresh drops) or a gift card or saldo
 * credit line. A cart it cannot read is left to the refresh, whose own
 * read says it was not found.
 */
const holdsLoyalty = (cart: CartLoyalty | undefined) =>
  !cart ||
  !!cart.gift_cards?.some(Boolean) ||
  !!cart.credit_lines?.some(
    (line) => !!line?.reference && LOYALTY_REFERENCES.includes(line.reference)
  );

/**
 * Before core refreshes a cart's payment collection (every add, update or
 * removal of a line), the cart's gift card and store credit lines are
 * rebuilt against its new total.
 */
export const refreshLoyaltyCreditLines = async (data, stepContext) => {
  const { container, ...sharedContext } = stepContext;

  // Pagly: a cart with neither builds nothing, so the refresh (two cart
  // reads with totals and four nested workflows) is skipped. Its result is
  // not read by core. With no cart id the filter would match every cart, so
  // that refresh is left to fail as it always did.
  const cartId = data.input.cart_id;
  const carts = cartId
    ? (
        await container.resolve(ContainerRegistrationKeys.QUERY).graph({
          entity: "cart",
          fields: ["id", "gift_cards.id", "credit_lines.reference"],
          filters: { id: cartId },
        })
      ).data
    : [];

  if (cartId && !holdsLoyalty(carts[0])) {
    // null, not undefined: StepResponse would hand the output to compensate.
    return new StepResponse([], null);
  }

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

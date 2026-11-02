import { CreateCartCreditLineDTO } from "@medusajs/framework/types";
import { MathBN, Modules } from "@medusajs/framework/utils";
import {
  createCartCreditLinesWorkflow,
  createLinksWorkflow,
  deleteCartCreditLinesWorkflow,
  dismissLinksWorkflow,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows";
import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk";
import { PluginModule } from "../../../types";
import { isGiftCardExpired } from "../../../utils/gift-card";
import { giftCardCreditLineMetadata } from "../../../utils/gift-card-credit-line";
import { retrieveGiftCardsBalanceStep } from "../../gift-cards/steps/retrieve-gift-card-balance";
import { retrieveStoreCreditAccountsStatsStep } from "../../store-credit/steps/retrieve-store-credit-accounts-stats";

/**
 * Data to refresh the gift card credit lines on a cart.
 */
export type RefreshCartGiftCardsWorkflowInput = {
  /**
   * The ID of the cart for which to refresh gift card credit lines.
   */
  cart_id: string;
};

/**
 * This workflow refreshes the gift card credit lines on a cart. It removes existing
 * gift card credit lines and recreates them based on current gift card balances,
 * accounting for any changes to the cart total or gift card balances.
 *
 * You can use this workflow within your own customizations or custom workflows,
 * allowing you to wrap custom logic around refreshing cart gift cards.
 *
 * @example
 * const { result } = await refreshCartGiftCardsWorkflow(container)
 *   .run({
 *     input: {
 *       cart_id: "cart_123",
 *     },
 *   })
 *
 * @summary
 *
 * Refresh gift card credit lines on a cart.
 */
export const refreshCartGiftCardsWorkflow = createWorkflow(
  "refresh-cart-gift-card",
  function (input: RefreshCartGiftCardsWorkflowInput) {
    const existingCardQuery = useQueryGraphStep({
      entity: "cart",
      filters: { id: input.cart_id },
      fields: [
        "id",
        "currency_code",
        "total",
        "gift_cards.id",
        "gift_cards.code",
        "credit_lines.id",
        "credit_lines.amount",
        "credit_lines.reference",
        "credit_lines.reference_id",
        "credit_lines.metadata",
      ],
      options: { throwIfKeyNotFound: true },
    }).config({ name: "get-existing-cart-query" });

    const existingCart = transform(
      { existingCardQuery },
      ({ existingCardQuery }) => {
        return existingCardQuery.data[0];
      }
    );

    // Pagly: store credit lines are rebuilt too (capped to the balance left and
    // to what the cart owes), and every card on the cart is unlinked so that
    // only the usable ones are linked again below.
    const toDismiss = transform({ existingCart }, ({ existingCart }) => {
      const loyaltyCreditLines = existingCart.credit_lines.filter(
        (creditLine) =>
          creditLine.reference === "gift-card" ||
          creditLine.reference === "store-credit"
      );

      return {
        creditLineIds: loyaltyCreditLines.map((cl) => cl.id),
        giftCardIds: existingCart.gift_cards.map((gc) => gc.id),
        storeCreditLines: loyaltyCreditLines
          .filter((cl) => cl.reference === "store-credit")
          .map((cl) => ({
            account_id: cl.reference_id,
            amount: cl.amount,
            metadata: cl.metadata ?? {},
          })),
      };
    });

    deleteCartCreditLinesWorkflow.runAsStep({
      input: {
        id: toDismiss.creditLineIds,
      },
    });

    const linksToDismiss = transform(
      { toDismiss, existingCart },
      ({ toDismiss, existingCart }) => {
        const links = toDismiss.giftCardIds.map((giftCardId) => ({
          [Modules.CART]: { cart_id: existingCart.id },
          [PluginModule.LOYALTY]: { gift_card_id: giftCardId },
        }));

        return links;
      }
    );

    dismissLinksWorkflow.runAsStep({ input: linksToDismiss });

    const giftCardCodes = transform({ existingCart }, ({ existingCart }) => {
      return existingCart.gift_cards.map((gc) => gc.code);
    });

    const giftCardQuery = useQueryGraphStep({
      entity: "gift_card",
      filters: { code: giftCardCodes },
      fields: ["id", "code", "status", "currency_code", "expires_at"],
    }).config({ name: "get-gift-card-query" });

    // expired gift cards are dropped rather than rejected, so that a cart
    // holding a gift card that expired after it was applied can still be
    // refreshed. Their credit lines and links were already removed above.
    const giftCards = transform({ giftCardQuery }, ({ giftCardQuery }) => {
      return giftCardQuery.data.filter(
        (giftCard) => !isGiftCardExpired(giftCard)
      );
    });

    const giftCardsIds = transform({ giftCards }, ({ giftCards }) => {
      return giftCards.map((gc) => gc.id);
    });

    const giftCardStoreCreditAccountQuery = useQueryGraphStep({
      entity: "gift_card_store_credit_account",
      filters: {
        gift_card_id: giftCardsIds,
      },
      fields: ["id", "store_credit_account_id", "gift_card_id"],
    }).config({ name: "get-gift-card-store-credit-account-query" });

    const { giftCardStoreCreditAccountMap } = transform(
      { giftCardStoreCreditAccountQuery },
      ({ giftCardStoreCreditAccountQuery }) => {
        const giftCardStoreCreditAccountMap: Record<string, string> = {};

        for (const gcsa of giftCardStoreCreditAccountQuery.data) {
          giftCardStoreCreditAccountMap[gcsa.gift_card_id] =
            gcsa.store_credit_account_id;
        }

        return {
          giftCardStoreCreditAccountMap,
        };
      }
    );

    const giftCardsBalanceMap = retrieveGiftCardsBalanceStep({
      giftCards,
      giftCardStoreCreditAccountMap,
    });

    // Pagly: a card with nothing left is dropped like an expired one, instead
    // of refusing every later change to the cart.
    const usableGiftCards = transform(
      { giftCards, giftCardsBalanceMap },
      ({ giftCards, giftCardsBalanceMap }) => {
        return giftCards.filter((giftCard) =>
          MathBN.convert(giftCardsBalanceMap[giftCard.code].balance).gt(0)
        );
      }
    );

    const storeCreditAccountIds = transform({ toDismiss }, ({ toDismiss }) => {
      return toDismiss.storeCreditLines.map((line) => line.account_id);
    });

    const storeCreditBalanceMap = retrieveStoreCreditAccountsStatsStep({
      account_ids: storeCreditAccountIds,
    });

    const updatedCardQuery = useQueryGraphStep({
      entity: "cart",
      filters: { id: input.cart_id },
      fields: [
        "id",
        "currency_code",
        "total",
        "gift_cards.code",
        "customer_id",
      ],
      options: { throwIfKeyNotFound: true },
    }).config({ name: "get-cart-query" });

    const cart = transform({ updatedCardQuery }, ({ updatedCardQuery }) => {
      return updatedCardQuery.data[0];
    });

    const creditLinesToCreate = transform(
      {
        giftCardsBalanceMap,
        usableGiftCards,
        cart,
        toDismiss,
        storeCreditBalanceMap,
      },
      ({
        giftCardsBalanceMap,
        usableGiftCards,
        cart,
        toDismiss,
        storeCreditBalanceMap,
      }) => {
        let tempCartTotal = MathBN.convert(cart.total);
        const creditLinesData: CreateCartCreditLineDTO[] = [];

        // Pagly: store credit first, keeping as much of what the shopper chose
        // as the account's balance and the cart still allow.
        for (const line of toDismiss.storeCreditLines) {
          const balance = storeCreditBalanceMap[line.account_id]?.balance ?? 0;
          const amount = MathBN.min(line.amount, balance, tempCartTotal);

          if (amount.gt(0)) {
            creditLinesData.push({
              cart_id: cart.id,
              amount: amount.toNumber(),
              reference: "store-credit",
              reference_id: line.account_id,
              metadata: line.metadata,
            });

            tempCartTotal = tempCartTotal.minus(amount);
          }
        }

        for (const giftCard of usableGiftCards) {
          const stats = giftCardsBalanceMap[giftCard.code];
          const amount = MathBN.min(stats.balance, tempCartTotal);

          if (amount.gt(0)) {
            creditLinesData.push({
              cart_id: cart.id,
              amount: amount.toNumber(),
              reference: "gift-card",
              reference_id: giftCard.id,
              // Pagly: names the card on carts and orders without its code.
              metadata: giftCardCreditLineMetadata(giftCard.code),
            });

            tempCartTotal = tempCartTotal.minus(amount);
          }
        }

        return creditLinesData;
      }
    );

    const creditLines = createCartCreditLinesWorkflow.runAsStep({
      input: creditLinesToCreate,
    });

    const linksToCreate = transform(
      { usableGiftCards, cart },
      ({ usableGiftCards, cart }) => {
        const links = usableGiftCards.map((giftCard) => ({
          [Modules.CART]: { cart_id: cart.id },
          [PluginModule.LOYALTY]: { gift_card_id: giftCard.id },
        }));

        return links;
      }
    );

    createLinksWorkflow.runAsStep({ input: linksToCreate });

    return new WorkflowResponse(creditLines);
  }
);

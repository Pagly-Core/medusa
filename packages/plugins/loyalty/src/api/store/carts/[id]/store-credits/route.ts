import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";
import { HttpTypes } from "@medusajs/framework/types";
import { addStoreCreditsToCartWorkflow } from "../../../../../workflows/carts/workflows/add-store-credits-to-cart";
import { StoreAddStoreCreditsToCart } from "../../../../../types";

export const POST = async (
  req: AuthenticatedMedusaRequest<StoreAddStoreCreditsToCart>,
  res: MedusaResponse<HttpTypes.StoreCartResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.REMOTE_QUERY);
  const { id } = req.params;

  // Pagly: only the cart's own customer may spend their store credit on it.
  const {
    data: [owner],
  } = await query.graph(
    {
      entity: "cart",
      fields: ["id", "customer_id"],
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  );

  if (owner.customer_id && owner.customer_id !== req.auth_context.actor_id) {
    throw new MedusaError(
      MedusaError.Types.FORBIDDEN,
      "Store credit can only be used by the cart's customer"
    );
  }

  await addStoreCreditsToCartWorkflow.run({
    input: {
      cart_id: id,
      ...req.validatedBody,
    },
    container: req.scope,
  });

  const {
    data: [cart],
  } = await query.graph(
    {
      entity: "cart",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  );

  res.json({ cart });
};

import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateGiftCardsWorkflow } from "../../../../workflows/gift-cards/workflows/update-gift-cards";
import { AdminGiftCardResponse, AdminUpdateGiftCardParams } from "../../../../types";

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<AdminGiftCardResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { id } = req.params;

  const {
    data: [gift_card],
  } = await query.graph(
    {
      entity: "gift_cards",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  );

  res.json({ gift_card });
};

export const POST = async (
  req: AuthenticatedMedusaRequest<AdminUpdateGiftCardParams>,
  res: MedusaResponse<AdminGiftCardResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { id } = req.params;

  await query.graph(
    {
      entity: "gift_cards",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  );

  // Pagly: runs in the request's container (the store being served) with the
  // validated body; without a container it ran in the global one.
  await updateGiftCardsWorkflow.run({
    input: [
      {
        id,
        ...req.validatedBody,
      },
    ],
    container: req.scope,
  });

  const {
    data: [gift_card],
  } = await query.graph(
    {
      entity: "gift_cards",
      fields: req.queryConfig.fields,
      filters: { id },
    },
    { throwIfKeyNotFound: true }
  );

  res.json({ gift_card });
};

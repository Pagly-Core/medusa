import { buildAllowedFields } from "@medusajs/medusa/api/store/utils/allowed-fields";
import { storeCreditAccountScalarFields } from "../store-credit-accounts/query-config";

// Pagly: store routes are public, so a gift card shows what its holder needs.
// Its note, its origin (`reference`, `reference_id`, `line_item_id` and the
// line item, which lead to the buyer's address through the public order read)
// and its metadata stay in the admin.
export const giftCardFields = [
  "id",
  "status",
  "code",
  "value",
  "currency_code",
  "expires_at",
  "updated_at",
  "created_at",
];

export const giftCardScalarFields = [...giftCardFields];

const storeCreditAccountRelationFields = [
  "store_credit_account",
  ...storeCreditAccountScalarFields.map(
    (field) => `store_credit_account.${field}`
  ),
];

export const giftCardAllowedFields = buildAllowedFields(
  giftCardScalarFields,
  storeCreditAccountRelationFields
);

// Pagly: fields one by one, without the bare relation, so `*gift_cards` can't
// select every column of the cards on a cart.
export const giftCardRelationAllowedFields = giftCardAllowedFields.map(
  (field) => `gift_cards.${field}`
);

// Pagly: what a cart shows of the cards applied to it.
export const giftCardRelationDefaultFields = giftCardFields.map(
  (field) => `gift_cards.${field}`
);

export const retrieveGiftCardTransformQueryConfig = {
  defaults: giftCardFields,
  allowed: giftCardAllowedFields,
  isList: false,
};

export const listGiftCardsTransformQueryConfig = {
  defaults: giftCardFields,
  allowed: giftCardAllowedFields,
  isList: true,
};

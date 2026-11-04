export enum PluginModule {
  LOYALTY = "loyalty",
  STORE_CREDIT = "store_credit",
}

export enum LoyaltyEvents {
  // Pagly: a gift card was created, bought in an order or issued in the admin. Data: `{ id }`.
  GIFT_CARD_CREATED = "gift_card.created",
}

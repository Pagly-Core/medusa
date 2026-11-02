import { defineMiddlewares } from "@medusajs/framework"
import { allowFields } from "@medusajs/framework/http"
import { MiddlewareRoute } from "@medusajs/medusa"
import { adminGiftCardMiddlewares } from "./admin/gift-cards/middlewares"
import { adminStoreCreditAccountMiddlewares } from "./admin/store-credit-accounts/middlewares"
import { storeCartMiddlewares } from "./store/carts/middlewares"
import { giftCardRelationAllowedFields } from "./store/gift-cards/query-config"
import { storeGiftCardsMiddlewares } from "./store/gift-cards/middlewares"
import { storeStoreCreditAccountMiddlewares } from "./store/store-credit-accounts/middlewares"

const allowGiftCardRelation: MiddlewareRoute = {
  // Pagly: carts only. `GET /store/orders/:id` needs no sign-in, so it would
  // hand anyone with an order ID the codes of the cards used on it.
  matcher: /^\/store\/carts(?=\/|$)/,
  middlewares: [allowFields(giftCardRelationAllowedFields)],
}

export default defineMiddlewares({
  routes: [
    allowGiftCardRelation,
    ...adminGiftCardMiddlewares,
    ...storeGiftCardsMiddlewares,
    ...adminStoreCreditAccountMiddlewares,
    ...storeStoreCreditAccountMiddlewares,
    ...storeCartMiddlewares,
  ],
})

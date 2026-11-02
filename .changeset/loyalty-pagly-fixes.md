---
"@medusajs/loyalty-plugin": patch
---

fix(loyalty-plugin): keep cart gift card and store credit lines within the balances and the cart total, drop empty cards on refresh, check store credit ownership, keep gift card notes, origins and the cards used on an order off the store API, issue bought cards once, emit `gift_card.created`, read balances in one grouped query, and ship no admin extension

// Pagly: one order for the order page specs. Ana's #2 from the approved mock:
// two lines (a mug ×2 and an embroidered apron), paid by hand, not yet sent.

const NOW = "2026-11-20T13:19:00.000Z"

type Over = Record<string, unknown>

export const lineDetail = (over: Over = {}) => ({
  fulfilled_quantity: 0,
  shipped_quantity: 0,
  delivered_quantity: 0,
  return_requested_quantity: 0,
  return_received_quantity: 0,
  ...over,
})

export const orderItem = (id: string, over: Over = {}) => ({
  id,
  title: "Taza de cerámica",
  product_title: "Taza de cerámica",
  variant_title: "Blanca",
  variant_sku: null,
  thumbnail: null,
  quantity: 2,
  unit_price: 690,
  subtotal: 1380,
  requires_shipping: true,
  is_tax_inclusive: true,
  adjustments: [],
  tax_lines: [],
  created_at: NOW,
  variant: {
    title: "Blanca",
    manage_inventory: false,
    options: [{ id: "optval_blanca", value: "Blanca" }],
  },
  ...over,
  detail: lineDetail((over.detail as Over) ?? {}),
})

export const payment = (over: Over = {}) => ({
  id: "pay_1",
  provider_id: "pp_system_default",
  amount: 2833,
  currency_code: "uyu",
  created_at: NOW,
  captured_at: NOW,
  canceled_at: null,
  captures: [{ id: "capt_1", amount: 2833, created_at: NOW }],
  refunds: [],
  data: {},
  ...over,
})

export const fulfillment = (id: string, over: Over = {}) => ({
  id,
  location_id: null,
  provider_id: "manual_manual",
  requires_shipping: true,
  created_at: NOW,
  packed_at: NOW,
  shipped_at: null,
  delivered_at: null,
  canceled_at: null,
  labels: [],
  items: [],
  ...over,
})

export const makeOrder = (over: Over = {}) =>
  ({
    id: "order_1",
    display_id: 2,
    status: "pending",
    created_at: NOW,
    canceled_at: null,
    currency_code: "uyu",
    email: "ana.perez@gmail.com",
    customer: {
      id: "cus_1",
      first_name: "Ana",
      last_name: "Pérez",
      email: "ana.perez@gmail.com",
      phone: "099 123 456",
    },
    sales_channel: { id: "sc_1", name: "Tienda online" },
    payment_status: "captured",
    fulfillment_status: "not_fulfilled",
    items: [
      orderItem("item_mug"),
      orderItem("item_apron", {
        title: "Delantal de lino",
        product_title: "Delantal de lino",
        variant_title: "Arena · M",
        quantity: 1,
        unit_price: 1490,
        subtotal: 1490,
        variant: {
          title: "Arena · M",
          manage_inventory: false,
          options: [
            { id: "optval_arena", value: "Arena" },
            { id: "optval_m", value: "M" },
          ],
        },
      }),
    ],
    shipping_methods: [
      {
        id: "sm_1",
        name: "UES a domicilio",
        subtotal: 250,
        total: 250,
        created_at: NOW,
        adjustments: [],
        tax_lines: [],
        detail: {},
      },
    ],
    shipping_address: {
      id: "addr_ship",
      first_name: "Ana",
      last_name: "Pérez",
      address_1: "Av. 18 de Julio 1234",
      address_2: "apto. 502",
      city: "Montevideo",
      postal_code: "11100",
      province: null,
      country_code: "uy",
      phone: "099 123 456",
      company: null,
    },
    billing_address: null,
    fulfillments: [],
    payment_collections: [
      {
        id: "paycol_1",
        status: "completed",
        amount: 2833,
        currency_code: "uyu",
        payments: [payment()],
      },
    ],
    summary: { pending_difference: 0 },
    credit_lines: [],
    promotions: [],
    item_subtotal: 2870,
    item_discount_total: 287,
    discount_total: 287,
    shipping_subtotal: 250,
    shipping_discount_total: 0,
    shipping_total: 250,
    original_total: 3120,
    total: 2833,
    tax_total: 510.87,
    original_tax_total: 510.87,
    credit_line_total: 0,
    order_change: null,
    metadata: {},
    ...over,
  }) as any

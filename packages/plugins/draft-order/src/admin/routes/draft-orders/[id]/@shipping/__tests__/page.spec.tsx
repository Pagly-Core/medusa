// @vitest-environment jsdom
import { TooltipProvider } from "@medusajs/ui"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"

import {
  mugItem,
  pageText,
  shippingOption,
} from "../../../../../__tests__/fixtures/one-version-items"
import { inSpanish } from "../../../../../__tests__/fixtures/i18n"
import { openActionMenu } from "../../../../../__tests__/fixtures/menus"
import Shipping from "../page"

const state = vi.hoisted(() => ({
  order: {} as Record<string, unknown>,
  shippingMethods: [] as unknown[],
  shippingOptions: [] as unknown[],
}))

const mutation = vi.hoisted(() => () => ({
  mutateAsync: () => Promise.resolve(),
  isPending: false,
}))

vi.mock("../../../../../components/modals", async () =>
  (await import("../../../../../__tests__/fixtures/modals")).modalsMock()
)

vi.mock("../../../../../hooks/api/draft-orders", () => ({
  useDraftOrderAddShippingMethod: mutation,
  useDraftOrderConfirmEdit: mutation,
  useDraftOrderRemoveActionShippingMethod: mutation,
  useDraftOrderRemoveShippingMethod: mutation,
  useDraftOrderRequestEdit: mutation,
  useDraftOrderUpdateShippingMethod: mutation,
}))

vi.mock("../../../../../hooks/api/orders", async () => {
  const { draftOrder } = await import(
    "../../../../../__tests__/fixtures/one-version-items"
  )

  return {
    useOrder: () => ({
      order: draftOrder(state.order),
      isPending: false,
      isError: false,
    }),
    useOrderPreview: () => ({
      order: draftOrder({ ...state.order, shipping_methods: state.shippingMethods }),
      isPending: false,
      isError: false,
    }),
  }
})

vi.mock("../../../../../hooks/api/shipping-options", () => ({
  useShippingOptions: () => ({ shipping_options: state.shippingOptions }),
}))

vi.mock("../../../../../hooks/common/use-combobox-data", () => ({
  useComboboxData: () => ({
    options: [],
    searchValue: "",
    onSearchValueChange: () => {},
    fetchNextPage: () => {},
    isFetchingNextPage: false,
    disabled: false,
  }),
}))

vi.mock("../../../../../lib/queries/sdk", () => ({ sdk: {} }))

vi.mock("../../../../../hooks/order-edits/use-cancel-order-edit", () => ({
  useCancelOrderEdit: () => ({ onCancel: () => {} }),
}))

vi.mock("../../../../../hooks/order-edits/use-initiate-order-edit", () => ({
  useInitiateOrderEdit: () => {},
}))

beforeAll(() => {
  // jsdom has no IntersectionObserver; the comboboxes watch their last option.
  globalThis.IntersectionObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver
})

afterEach(() => {
  cleanup()
  state.order = {}
  state.shippingMethods = []
  state.shippingOptions = []
})

const renderShipping = () =>
  render(
    <MemoryRouter>
      <TooltipProvider>
        <Shipping />
      </TooltipProvider>
    </MemoryRouter>
  )

/** Opens the shipping profile's row to list its items. */
const expandProfile = () => {
  const [trigger] = screen
    .getAllByRole("button")
    .filter((button) => button.getAttribute("aria-expanded") === "false")
  fireEvent.click(trigger)
}

const shipWithMoto = () => {
  state.shippingMethods = [
    {
      id: "sm_moto",
      shipping_option_id: shippingOption.id,
      actions: [],
    },
  ]
  state.shippingOptions = [shippingOption]
}

describe("Edit shipping", () => {
  it("lists a product's one version by the product alone", () => {
    renderShipping()
    expandProfile()

    expect(screen.getByText("Taza de cerámica hecha a mano")).toBeTruthy()
    expect(screen.getByText("Remera (M / Negro)")).toBeTruthy()
    expect(pageText()).not.toContain("Default variant")
  })

  it("leaves out the default option's value", () => {
    renderShipping()
    expandProfile()

    expect(screen.getByText("M · Negro")).toBeTruthy()
    expect(pageText()).not.toContain("Default option value")
  })

  it("lists the items on the badge's tooltip without the default title", async () => {
    shipWithMoto()
    renderShipping()

    fireEvent.focusIn(screen.getByText(/3x items/))
    const tooltip = await screen.findByRole("tooltip")

    expect(
      within(tooltip).getByText("2x Taza de cerámica hecha a mano")
    ).toBeTruthy()
    expect(within(tooltip).getByText("1x Remera (M / Negro)")).toBeTruthy()
  })

  // Pagly-Core/pagly-app#256: with no product that has a shipping profile, the
  // dialog showed only its table header, with no word of why.
  it("says nothing in the order ships when no product has a shipping profile", () => {
    state.order = {
      items: [
        { ...mugItem, variant: { ...mugItem.variant, product: { ...mugItem.variant.product, shipping_profile: null } } },
      ],
    }
    renderShipping()

    expect(screen.getByText("Nothing in this order ships: none of its products has a shipping profile.")).toBeTruthy()
  })

  it("shows the items to ship without the default title", () => {
    renderShipping()

    fireEvent.click(screen.getByRole("button", { name: "Add shipping option" }))

    expect(screen.getByText("Items to ship")).toBeTruthy()
    expect(screen.getByText("Taza de cerámica hecha a mano")).toBeTruthy()
    expect(screen.getByText("(M / Negro)")).toBeTruthy()
    expect(pageText()).not.toContain("Default variant")
  })
})

describe("Edit shipping in Spanish", () => {
  inSpanish()

  it("labels the shipping form", () => {
    renderShipping()

    expect(screen.getByText("Envío")).toBeTruthy()
    expect(
      screen.getByText(
        "Elegí qué métodos de envío usar para los artículos del pedido."
      )
    ).toBeTruthy()
    expect(screen.getByText("Perfil de envío")).toBeTruthy()
    expect(screen.getByText("Acción")).toBeTruthy()
    expect(screen.getByText("2 artículos")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Guardar" })).toBeTruthy()
  })

  it("labels the form that adds a shipping option", () => {
    renderShipping()
    fireEvent.click(
      screen.getByRole("button", { name: "Agregar opción de envío" })
    )

    expect(
      screen.getByText(
        "Agregá un método de envío para el perfil de envío elegido. Abajo ves los artículos que se envían con este método."
      )
    ).toBeTruthy()
    expect(screen.getByText("Ubicación")).toBeTruthy()
    expect(
      screen.getByText("Elegí desde dónde enviar los artículos.")
    ).toBeTruthy()
    expect(screen.getByText("Opción de envío")).toBeTruthy()
    expect(screen.getByText("Elegí la opción de envío a usar.")).toBeTruthy()
    expect(screen.getByText("Monto personalizado")).toBeTruthy()
    expect(screen.getByText("Artículos a enviar")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Agregar" })).toBeTruthy()
  })

  it("counts a shipped profile's units and names its actions", () => {
    shipWithMoto()
    renderShipping()

    expect(screen.getByText("3 artículos")).toBeTruthy()
    openActionMenu()
    expect(
      screen.getByRole("menuitem", { name: "Editar opción de envío" })
    ).toBeTruthy()
    expect(
      screen.getByRole("menuitem", { name: "Quitar opción de envío" })
    ).toBeTruthy()
  })
})

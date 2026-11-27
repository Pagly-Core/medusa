// @vitest-environment jsdom
import { TooltipProvider } from "@medusajs/ui"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, describe, expect, it, vi } from "vitest"

import { makeProduct } from "../__fixtures__/product"
import { ProductDescriptionSection } from "../components/product-description-section"
import { ProductOrganizationSection } from "../components/product-organization-section"
import { ProductSellingSection } from "../components/product-selling-section"
import { ProductShippingSection } from "../components/product-shipping-section"
import { ProductWhereSection } from "../components/product-where-section"

vi.hoisted(() => {
  const g = globalThis as Record<string, unknown>
  g.__BACKEND_URL__ = "http://localhost:9000"
  g.__AUTH_TYPE__ = "session"
  g.__JWT_TOKEN_STORAGE_KEY__ = ""
})

const { mutateAsync, parts } = vi.hoisted(() => ({
  mutateAsync: vi.fn(async (_body: unknown, _opts?: unknown) => ({})),
  parts: { current: {} as Record<string, unknown[]> },
}))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: Record<string, unknown>) =>
      values ? `${key} ${JSON.stringify(values)}` : key,
    i18n: { language: "es" },
  }),
}))

vi.mock("../../../../hooks/api/products", () => ({
  useUpdateProduct: () => ({ mutateAsync, isPending: false }),
}))

vi.mock("../../../../providers/extension-provider", () => ({
  useExtension: () => ({
    getWidgets: (zone: string) => parts.current[zone] ?? [],
    getDisplays: () => [],
  }),
}))

vi.mock("../../../../components/common/action-menu", () => ({
  ActionMenu: ({ groups }: { groups: { actions: { label: string }[] }[] }) => (
    <span>
      {groups
        .flatMap((g) => g.actions)
        .map((a) => (
          <span key={a.label}>{a.label}</span>
        ))}
    </span>
  ),
}))

afterEach(() => {
  cleanup()
  parts.current = {}
  mutateAsync.mockClear()
})

const renderIn = (node: React.ReactNode) =>
  render(
    <MemoryRouter>
      <TooltipProvider>{node}</TooltipProvider>
    </MemoryRouter>
  )

const part =
  (label: string) =>
  ({ data }: { data: { title: string } }) =>
    <span>{`${label} ${data.title}`}</span>

describe("Descripción", () => {
  it("shows the subtitle, the description as text and the address in the store, edited from a pencil", () => {
    renderIn(<ProductDescriptionSection product={makeProduct()} />)
    expect(screen.getByText("Lino 100 %, corte recto")).toBeTruthy()
    expect(screen.getByText("Remera de lino con cuello redondo.")).toBeTruthy()
    expect(screen.getByText("/products/remera-lino")).toBeTruthy()
    expect(
      screen
        .getByRole("link", { name: "products.page.description.edit" })
        .getAttribute("href")
    ).toBe("/edit")
  })

  it("shows the material only when it has one", () => {
    const { unmount } = renderIn(
      <ProductDescriptionSection product={makeProduct()} />
    )
    expect(screen.queryByText("fields.material")).toBeNull()
    unmount()
    renderIn(
      <ProductDescriptionSection product={makeProduct({ material: "Lino" })} />
    )
    expect(screen.getByText("fields.material")).toBeTruthy()
    expect(screen.getByText("Lino")).toBeTruthy()
  })

  it("asks for a description when there's none", () => {
    renderIn(
      <ProductDescriptionSection
        product={makeProduct({ description: null, subtitle: null })}
      />
    )
    expect(screen.getByText("products.page.description.empty")).toBeTruthy()
  })
})

describe("Dónde se vende", () => {
  it("says whether the online store shows it, with the parts about where it sells", () => {
    parts.current["product.details.where"] = [part("agents")]
    renderIn(<ProductWhereSection product={makeProduct()} />)
    expect(screen.getByText("products.page.where.store")).toBeTruthy()
    expect(screen.getByText("products.productStatus.published")).toBeTruthy()
    expect(screen.getByText("agents Remera lino")).toBeTruthy()
    expect(screen.getByText("products.page.where.channels")).toBeTruthy()
  })

  it("says it's out of the store when published in no channel", () => {
    renderIn(
      <ProductWhereSection product={makeProduct({ sales_channels: [] })} />
    )
    expect(screen.getByText("products.page.where.notInStore")).toBeTruthy()
  })
})

describe("Organización", () => {
  it("lists the parts' rows first, then only the rows with something in them", () => {
    parts.current["product.details.organization"] = [part("collections")]
    renderIn(<ProductOrganizationSection product={makeProduct({ tags: [] })} />)
    const text = document.body.textContent ?? ""
    expect(text.indexOf("collections Remera lino")).toBeLessThan(
      text.indexOf("Remeras")
    )
    expect(screen.getByText("Ropa")).toBeTruthy()
    expect(screen.queryByText("fields.tags")).toBeNull()
    expect(
      screen
        .getByRole("link", { name: "products.page.organization.edit" })
        .getAttribute("href")
    ).toBe("/organization")
  })

  it("names the type row as the product's type, not the generic Tipo", () => {
    renderIn(<ProductOrganizationSection product={makeProduct()} />)
    expect(screen.getByText("products.fields.type.label")).toBeTruthy()
    expect(screen.queryByText("fields.type")).toBeNull()
  })

  it("says when it has no category, type or tags", () => {
    renderIn(
      <ProductOrganizationSection
        product={makeProduct({
          tags: [],
          categories: [],
          type: null,
          type_id: null,
        })}
      />
    )
    expect(screen.getByText("products.page.organization.empty")).toBeTruthy()
  })
})

describe("Envío", () => {
  it("shows the weight in kilos and the sides in centimetres, edited from a pencil", () => {
    renderIn(<ProductShippingSection product={makeProduct()} />)
    expect(
      screen.getByText(
        new Intl.NumberFormat("es", { style: "unit", unit: "kilogram" }).format(
          0.25
        )
      )
    ).toBeTruthy()
    expect(
      screen.getByText(
        'products.page.shipping.sizesValue {"length":"30","width":"25","height":"3"}'
      )
    ).toBeTruthy()
    expect(
      screen
        .getByRole("link", { name: "products.page.shipping.edit" })
        .getAttribute("href")
    ).toBe("/attributes")
  })

  it("shows customs codes and a shipping profile only when they say something", () => {
    const { unmount } = renderIn(
      <ProductShippingSection product={makeProduct()} />
    )
    expect(screen.queryByText("fields.hsCode")).toBeNull()
    expect(screen.queryByText("products.page.shipping.profile")).toBeNull()
    unmount()

    renderIn(
      <ProductShippingSection
        product={makeProduct({
          hs_code: "6109",
          shipping_profile: { id: "sp_2", name: "Frágil", type: "custom" },
        })}
      />
    )
    expect(screen.getByText("6109")).toBeTruthy()
    expect(screen.getByText("Frágil")).toBeTruthy()
  })

  it("asks for the measures when it has none, and keeps the parts' rows", () => {
    parts.current["product.details.shipping"] = [part("own box")]
    renderIn(
      <ProductShippingSection
        product={makeProduct({
          weight: null,
          length: null,
          width: null,
          height: null,
        })}
      />
    )
    expect(screen.getByText("products.page.shipping.empty")).toBeTruthy()
    expect(screen.getByText("own box Remera lino")).toBeTruthy()
  })
})

describe("Venta", () => {
  it("switches discounts off", async () => {
    renderIn(
      <ProductSellingSection product={makeProduct()} onCoverStock={() => {}} />
    )
    const toggle = screen.getByRole("switch", {
      name: "products.page.selling.discountsLabel",
    })
    expect(toggle.getAttribute("aria-checked")).toBe("true")
    fireEvent.click(toggle)
    await vi.waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith(
        { discountable: false },
        expect.anything()
      )
    )
  })

  it("hands its parts the product and the way to sell without stock", () => {
    const seen: unknown[] = []
    parts.current["product.details.selling"] = [
      ({
        data,
        coverStock,
      }: {
        data: { title: string }
        coverStock: unknown
      }) => {
        seen.push(coverStock)
        return <span>{`preorder ${data.title}`}</span>
      },
    ]
    const onCoverStock = vi.fn()
    renderIn(
      <ProductSellingSection
        product={makeProduct()}
        onCoverStock={onCoverStock}
      />
    )
    expect(screen.getByText("preorder Remera lino")).toBeTruthy()
    expect(typeof seen[0]).toBe("function")
  })
})

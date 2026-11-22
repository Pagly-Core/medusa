// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.hoisted(() => {
  // jsdom has no ResizeObserver; the command bar asks for one.
  const g = globalThis as Record<string, unknown>
  g.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const { mutateAsync } = vi.hoisted(() => ({ mutateAsync: vi.fn() }))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock("react-router-dom", () => ({
  Link: ({ children }: { children: React.ReactNode }) => (
    <a href="#">{children}</a>
  ),
  useNavigate: () => vi.fn(),
}))

vi.mock("@medusajs/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@medusajs/ui")>()
  return {
    ...actual,
    Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    usePrompt: () => async () => true,
  }
})

vi.mock("../../../../../../components/common/action-menu", () => ({
  ActionMenu: () => null,
}))

vi.mock("../../../../../../hooks/api/products", () => ({
  useUpdateProduct: () => ({ mutateAsync }),
}))

import {
  MEDIA_ALT_HOOK_KEY,
  type MediaAltHook,
} from "../../../../../../lib/media-alt"
import { ProductMediaSection } from "../product-media-section"

const A = "http://localhost:9000/static/1-a.png"
const B = "http://localhost:9000/static/1-b.png"

const product = {
  id: "prod_1",
  title: "Taza",
  thumbnail: A,
  images: [
    { id: "img_a", url: A },
    { id: "img_b", url: B },
  ],
} as never

const register = (alts: Record<string, string | null>) => {
  const hook: MediaAltHook = {
    read: vi.fn(async (urls: string[]) =>
      Object.fromEntries(
        urls.filter((url) => url in alts).map((url) => [url, alts[url]])
      )
    ),
    save: vi.fn(async () => {}),
  }
  ;(globalThis as Record<string, unknown>)[MEDIA_ALT_HOOK_KEY] = hook
}

afterEach(() => {
  cleanup()
  delete (globalThis as Record<string, unknown>)[MEDIA_ALT_HOOK_KEY]
})

describe("ProductMediaSection alt text", () => {
  it("describes each photo with its alt, and marks the ones with none", async () => {
    register({ [A]: "Taza roja de cerámica", [B]: null })
    render(<ProductMediaSection product={product} />)

    await waitFor(() =>
      expect(
        screen.getByRole("img", { name: "Taza roja de cerámica" })
      ).toBeTruthy()
    )
    expect(screen.getAllByText("products.media.altMissing")).toHaveLength(1)
  })

  it("marks nothing without a media library", () => {
    render(<ProductMediaSection product={product} />)

    expect(screen.queryByText("products.media.altMissing")).toBeNull()
  })
})

// Pagly: a product's main photo is always its first photo.
describe("ProductMediaSection main photo", () => {
  it("makes the next photo the main one when the first is deleted", async () => {
    mutateAsync.mockReset()
    render(<ProductMediaSection product={product} />)

    fireEvent.click(screen.getAllByRole("checkbox")[0])
    fireEvent.click(screen.getByRole("button", { name: /actions\.delete/ }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync.mock.calls[0][0]).toEqual({
      images: [{ id: "img_b", url: B }],
      thumbnail: B,
    })
  })

  it("deletes from the photos as ranked, keeping the next one main", async () => {
    mutateAsync.mockReset()
    render(
      <ProductMediaSection
        product={
          {
            id: "prod_1",
            title: "Taza",
            thumbnail: B,
            images: [
              { id: "img_b", url: B, rank: 1 },
              { id: "img_a", url: A, rank: 0 },
            ],
          } as never
        }
      />
    )

    fireEvent.click(screen.getAllByRole("checkbox")[0])
    fireEvent.click(screen.getByRole("button", { name: /actions\.delete/ }))

    await waitFor(() => expect(mutateAsync).toHaveBeenCalled())
    expect(mutateAsync.mock.calls[0][0]).toEqual({
      images: [{ id: "img_b", url: B }],
      thumbnail: B,
    })
  })
})

// Pagly: the product page redesign's Fotos card.
describe("ProductMediaSection as Fotos", () => {
  it("is called Fotos, counts the photos, and marks the first as the main one", () => {
    render(<ProductMediaSection product={product} />)

    expect(screen.getByText("products.page.photos.title")).toBeTruthy()
    expect(screen.getByText("2")).toBeTruthy()
    expect(screen.getAllByText("products.page.photos.main")).toHaveLength(1)
  })

  it("ends the row with a tile that adds photos", () => {
    render(<ProductMediaSection product={product} />)

    expect(screen.getByText("products.page.photos.add")).toBeTruthy()
  })

  it("says the first photo is the one the store shows when there are none", () => {
    render(<ProductMediaSection product={{ id: "prod_1", title: "Taza", thumbnail: null, images: [] } as never} />)

    expect(screen.getByText("products.page.photos.empty.title")).toBeTruthy()
    expect(screen.getByText("products.page.photos.empty.detail")).toBeTruthy()
    expect(screen.getByText("products.page.photos.empty.action")).toBeTruthy()
  })
})

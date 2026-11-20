// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock("react-router-dom", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a href="#">{children}</a>,
  useNavigate: () => vi.fn(),
}))

vi.mock("@medusajs/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@medusajs/ui")>()
  return {
    ...actual,
    Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    usePrompt: () => vi.fn(),
  }
})

vi.mock("../../../../../../components/common/action-menu", () => ({
  ActionMenu: () => null,
}))

vi.mock("../../../../../../hooks/api/products", () => ({
  useUpdateProduct: () => ({ mutateAsync: vi.fn() }),
}))

import { MEDIA_ALT_HOOK_KEY, type MediaAltHook } from "../../../../../../lib/media-alt"
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
      Object.fromEntries(urls.filter((url) => url in alts).map((url) => [url, alts[url]]))
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
      expect(screen.getByRole("img", { name: "Taza roja de cerámica" })).toBeTruthy()
    )
    expect(screen.getAllByText("products.media.altMissing")).toHaveLength(1)
  })

  it("marks nothing without a media library", () => {
    render(<ProductMediaSection product={product} />)

    expect(screen.queryByText("products.media.altMissing")).toBeNull()
  })
})

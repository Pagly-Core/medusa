// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.hoisted(() => {
  // jsdom has no ResizeObserver; the command bar and drag layer ask for one.
  const g = globalThis as Record<string, unknown>
  g.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const { mutateAsync, handleSuccess, toastError } = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  handleSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

vi.mock("react-router-dom", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

vi.mock("@medusajs/ui", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@medusajs/ui")>()
  return {
    ...actual,
    Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    toast: { success: vi.fn(), error: toastError },
  }
})

vi.mock("../../../../../../components/modals", () => {
  const Pass = ({ children }: { children?: React.ReactNode }) => <>{children}</>
  return {
    RouteFocusModal: Object.assign(Pass, {
      Form: Pass,
      Header: Pass,
      Body: Pass,
      Footer: Pass,
      Close: Pass,
    }),
    useRouteModal: () => ({ handleSuccess }),
  }
})

vi.mock("../../../../../../components/utilities/keybound-form", () => ({
  KeyboundForm: (props: React.FormHTMLAttributes<HTMLFormElement>) => (
    <form {...props} />
  ),
}))

vi.mock("../../../../../../hooks/api/products", () => ({
  useUpdateProduct: () => ({ mutateAsync, isPending: false }),
}))

vi.mock("../../../../../../lib/client", () => ({ sdk: {} }))

vi.mock("../../../../common/components/upload-media-form-item", () => ({
  UploadMediaFormItem: () => null,
}))

import {
  MEDIA_ALT_HOOK_KEY,
  type MediaAltHook,
} from "../../../../../../lib/media-alt"
import { EditProductMediaForm } from "../edit-product-media-form"

const A = "http://localhost:9000/static/1-a.png"
const B = "http://localhost:9000/static/1-b.png"

const product = {
  id: "prod_1",
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
  return hook
}

const altInputs = () =>
  screen.queryAllByRole("textbox", {
    name: "products.media.altLabel",
  }) as HTMLInputElement[]

const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "actions.save" }))

beforeEach(() => {
  mutateAsync.mockReset()
  mutateAsync.mockImplementation(async (_body, options) =>
    options?.onSuccess?.()
  )
  handleSuccess.mockReset()
  toastError.mockReset()
})

afterEach(() => {
  cleanup()
  delete (globalThis as Record<string, unknown>)[MEDIA_ALT_HOOK_KEY]
})

describe("EditProductMediaForm alt text", () => {
  it("shows no alt field without a media library", () => {
    render(<EditProductMediaForm product={product} />)

    expect(altInputs()).toHaveLength(0)
  })

  it("gives each photo an alt field, filled with the library's words", async () => {
    register({ [A]: "Taza roja de cerámica", [B]: null })
    render(<EditProductMediaForm product={product} />)

    await waitFor(() =>
      expect(altInputs().map((input) => input.value)).toEqual([
        "Taza roja de cerámica",
        "",
      ])
    )
  })

  it("describes each photo with its alt", async () => {
    register({ [A]: "Taza roja de cerámica" })
    render(<EditProductMediaForm product={product} />)

    await waitFor(() =>
      expect(
        screen.getAllByRole("img", { name: "Taza roja de cerámica" }).length
      ).toBeGreaterThan(0)
    )
  })

  it("saves only the alts that changed, after the product", async () => {
    const hook = register({ [A]: "Taza roja", [B]: "Taza azul" })
    render(<EditProductMediaForm product={product} />)

    await waitFor(() => expect(altInputs()[0]?.value).toBe("Taza roja"))
    fireEvent.change(altInputs()[0], {
      target: { value: "Taza roja de cerámica, de frente" },
    })
    save()

    await waitFor(() => expect(hook.save).toHaveBeenCalledTimes(1))
    expect(hook.save).toHaveBeenCalledWith([
      { url: A, alt: "Taza roja de cerámica, de frente" },
    ])
    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        images: [
          { id: "img_a", url: A },
          { id: "img_b", url: B },
        ],
      })
    )
    expect(handleSuccess).toHaveBeenCalled()
  })

  it("writes nothing when no alt changed", async () => {
    const hook = register({ [A]: "Taza roja", [B]: null })
    render(<EditProductMediaForm product={product} />)

    await waitFor(() => expect(altInputs()[0]?.value).toBe("Taza roja"))
    save()

    await waitFor(() => expect(handleSuccess).toHaveBeenCalled())
    expect(hook.save).not.toHaveBeenCalled()
  })

  it("keeps the product saved and says so when the words fail to save", async () => {
    const hook = register({ [A]: null, [B]: null })
    ;(hook.save as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("down")
    )
    render(<EditProductMediaForm product={product} />)

    await waitFor(() => expect(altInputs()).toHaveLength(2))
    fireEvent.change(altInputs()[1], { target: { value: "Taza azul" } })
    save()

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("products.media.altFailedToast")
    )
    expect(mutateAsync).toHaveBeenCalled()
    expect(handleSuccess).toHaveBeenCalled()
  })
})

// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { useForm } from "react-hook-form"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.hoisted(() => {
  // jsdom has no ResizeObserver; the command bar and drag layer ask for one.
  const g = globalThis as Record<string, unknown>
  g.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

// The item menu, as plain buttons.
vi.mock("../../../../../../../../components/common/action-menu", () => ({
  ActionMenu: ({
    groups,
  }: {
    groups: { actions: { label: string; onClick?: () => void }[] }[]
  }) => (
    <>
      {groups
        .flatMap((group) => group.actions)
        .map((action) => (
          <button key={action.label} type="button" onClick={action.onClick}>
            {action.label}
          </button>
        ))}
    </>
  ),
}))

vi.mock("../../../../../../common/components/upload-media-form-item", () => ({
  UploadMediaFormItem: () => null,
}))

import {
  MEDIA_ALT_HOOK_KEY,
  type MediaAltHook,
} from "../../../../../../../../lib/media-alt"
import { ProductCreateMediaSection } from "../product-create-details-media-section"

const PICKED = "http://localhost:9000/static/1-picked.png"

let values: () => unknown

const Harness = ({ media }: { media: unknown[] }) => {
  const form = useForm({ defaultValues: { media } })
  values = () => form.getValues("media")
  return <ProductCreateMediaSection form={form as never} />
}

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

afterEach(() => {
  cleanup()
  delete (globalThis as Record<string, unknown>)[MEDIA_ALT_HOOK_KEY]
})

describe("ProductCreateMediaSection", () => {
  it("lists a photo picked from the library, not only dropped files", () => {
    render(
      <Harness
        media={[{ id: "p1", url: PICKED, isThumbnail: false, file: null }]}
      />
    )

    expect(screen.getByText("1-picked.png")).toBeTruthy()
  })

  it("names a picked photo whose address is not escaped, rather than failing", () => {
    render(
      <Harness
        media={[{ id: "p1", url: "http://localhost:9000/static/50%-off.png", isThumbnail: false, file: null }]}
      />
    )

    expect(screen.getByText("50%-off.png")).toBeTruthy()
  })

  it("shows no alt field without a media library", () => {
    render(
      <Harness
        media={[
          {
            id: "f1",
            url: "blob:1",
            isThumbnail: true,
            file: new File(["x"], "taza.png"),
          },
        ]}
      />
    )

    expect(altInputs()).toHaveLength(0)
  })

  it("gives each photo an alt field; a picked one starts with the library's words", async () => {
    register({ [PICKED]: "Taza roja de cerámica" })
    render(
      <Harness
        media={[
          { id: "p1", url: PICKED, isThumbnail: false, file: null },
          {
            id: "f1",
            url: "blob:1",
            isThumbnail: true,
            file: new File(["x"], "taza.png"),
          },
        ]}
      />
    )

    await waitFor(() =>
      expect(altInputs().map((input) => input.value)).toEqual([
        "Taza roja de cerámica",
        "",
      ])
    )
  })

  it("keeps what is typed in the photo's form value", async () => {
    register({})
    render(
      <Harness
        media={[
          {
            id: "f1",
            url: "blob:1",
            isThumbnail: true,
            file: new File(["x"], "taza.png"),
          },
        ]}
      />
    )

    await waitFor(() => expect(altInputs()).toHaveLength(1))
    fireEvent.change(altInputs()[0], {
      target: { value: "Taza azul, de costado" },
    })

    expect(values()).toEqual([
      expect.objectContaining({ id: "f1", alt: "Taza azul, de costado" }),
    ])
  })
})

// Pagly: a product's main photo is always its first photo.
describe("ProductCreateMediaSection main photo", () => {
  it("moves the photo made main to the front", () => {
    render(
      <Harness
        media={[
          { id: "p1", url: "http://localhost:9000/static/a.png", isThumbnail: false, file: null },
          { id: "p2", url: "http://localhost:9000/static/b.png", isThumbnail: false, file: null },
        ]}
      />
    )

    fireEvent.click(
      screen.getAllByRole("button", { name: "products.media.makeThumbnail" })[1]
    )

    expect((values() as { id: string }[]).map((m) => m.id)).toEqual([
      "p2",
      "p1",
    ])
  })
})

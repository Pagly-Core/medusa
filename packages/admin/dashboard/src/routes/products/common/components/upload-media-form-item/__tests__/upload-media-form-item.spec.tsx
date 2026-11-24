// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.hoisted(() => {
  const g = global as any
  g.__MAX_UPLOAD_FILE_SIZE__ = undefined
})

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

import { Form } from "../../../../../../components/common/form"
import { UploadMediaFormItem } from "../upload-media-form-item"

type PickerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  multiple?: boolean
  accept?: string | string[]
  onSelect: (
    files: {
      url: string
      file_id: string
      filename: string
      mime_type: string
    }[]
  ) => void
}

const pickerProps: PickerProps[] = []

/**
 * Stands in for the media library a plugin registers: it records how it was
 * opened and hands back two stored images.
 */
const FakePicker = (props: PickerProps) => {
  pickerProps.push(props)

  if (!props.open) {
    return null
  }

  return (
    <div role="dialog">
      <button
        type="button"
        onClick={() => {
          props.onSelect([
            {
              url: "http://localhost:9000/static/1-a.png",
              file_id: "1-a.png",
              filename: "a.png",
              mime_type: "image/png",
            },
            {
              url: "http://localhost:9000/static/1-b.png",
              file_id: "1-b.png",
              filename: "b.png",
              mime_type: "image/png",
            },
          ])
          props.onOpenChange(false)
        }}
      >
        pick
      </button>
    </div>
  )
}

const Harness = ({ append }: { append: (value: unknown) => void }) => {
  const form = useForm({ defaultValues: { media: [] } })

  return (
    <Form {...form}>
      <UploadMediaFormItem form={form as never} append={append as never} />
    </Form>
  )
}

const zone = () =>
  screen.getByRole("button", { name: /products.media.uploadImagesLabel/ })

let inputClick: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  pickerProps.length = 0
  inputClick = vi.spyOn(HTMLInputElement.prototype, "click")
  URL.createObjectURL = vi.fn(() => "blob:preview")
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  delete (globalThis as Record<string, unknown>).__paglyMediaPicker
})

describe("UploadMediaFormItem with a media library registered", () => {
  beforeEach(() => {
    ;(globalThis as Record<string, unknown>).__paglyMediaPicker = FakePicker
  })

  it("opens the library for several images instead of the file dialog", async () => {
    const user = userEvent.setup()
    render(<Harness append={vi.fn()} />)

    await user.click(zone())

    expect(inputClick).not.toHaveBeenCalled()
    expect(screen.getByRole("dialog")).toBeTruthy()
    expect(pickerProps.at(-1)).toMatchObject({
      open: true,
      multiple: true,
      accept: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/heic",
        "image/svg+xml",
        "video/mp4",
        "video/webm",
        "video/quicktime",
      ],
    })
  })

  it("adds the chosen images as already stored media", async () => {
    const user = userEvent.setup()
    const append = vi.fn()
    render(<Harness append={append} />)

    await user.click(zone())
    await user.click(screen.getByRole("button", { name: "pick" }))

    expect(append).toHaveBeenCalledTimes(2)
    expect(append).toHaveBeenNthCalledWith(1, {
      id: expect.any(String),
      url: "http://localhost:9000/static/1-a.png",
      isThumbnail: false,
      file: null,
    })
    expect(append).toHaveBeenNthCalledWith(2, {
      id: expect.any(String),
      url: "http://localhost:9000/static/1-b.png",
      isThumbnail: false,
      file: null,
    })
    // The edit form keys its selection by id, so each needs its own.
    expect(append.mock.calls[0][0].id).not.toBe(append.mock.calls[1][0].id)
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("still adds files dropped on it, to upload on save", () => {
    const append = vi.fn()
    const file = new File([new Uint8Array([1])], "drop.png", {
      type: "image/png",
    })
    render(<Harness append={append} />)

    fireEvent.drop(zone(), { dataTransfer: { files: [file] } })

    expect(append).toHaveBeenCalledWith({
      id: expect.any(String),
      url: "blob:preview",
      file,
      isThumbnail: false,
    })
  })
})

describe("UploadMediaFormItem without a media library", () => {
  it("opens the file dialog as before", async () => {
    const user = userEvent.setup()
    render(<Harness append={vi.fn()} />)

    await user.click(zone())

    expect(inputClick).toHaveBeenCalled()
    expect(screen.queryByRole("dialog")).toBeNull()
  })
})

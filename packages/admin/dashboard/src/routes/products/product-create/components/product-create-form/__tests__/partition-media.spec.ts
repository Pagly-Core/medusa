import { describe, expect, it } from "vitest"

import {
  firstPhotoIsMain,
  partitionMediaForUpload,
  withRequestAlts,
} from "../../../utils"

const file = (name: string) => new File(["x"], name, { type: "image/png" })

describe("partitionMediaForUpload", () => {
  it("uploads entries that carry a file, the thumbnail apart from the rest", () => {
    const thumb = { url: "blob:1", isThumbnail: true, file: file("t.png") }
    const other = { url: "blob:2", isThumbnail: false, file: file("o.png") }

    expect(partitionMediaForUpload([other, thumb])).toEqual({
      thumbnail: thumb,
      others: [other],
      stored: [],
    })
  })

  it("passes entries picked from the media library through as they are", () => {
    const picked = {
      url: "http://localhost:9000/static/1-a.png",
      isThumbnail: false,
      file: null,
    }

    expect(partitionMediaForUpload([picked])).toEqual({
      thumbnail: undefined,
      others: [],
      stored: [{ url: picked.url, isThumbnail: false }],
    })
  })

  it("keeps a picked thumbnail as the thumbnail", () => {
    const pickedThumb = {
      url: "http://localhost:9000/static/1-t.png",
      isThumbnail: true,
      file: null,
    }
    const dropped = { url: "blob:2", isThumbnail: false, file: file("d.png") }

    expect(partitionMediaForUpload([pickedThumb, dropped])).toEqual({
      thumbnail: undefined,
      others: [dropped],
      stored: [{ url: pickedThumb.url, isThumbnail: true }],
    })
  })

  it("treats a missing file like a picked one", () => {
    expect(
      partitionMediaForUpload([{ url: "http://cdn/x.png", isThumbnail: false }])
    ).toEqual({
      thumbnail: undefined,
      others: [],
      stored: [{ url: "http://cdn/x.png", isThumbnail: false }],
    })
  })

  it("keeps a picked photo's alt with it", () => {
    const picked = {
      url: "http://localhost:9000/static/1-a.png",
      isThumbnail: false,
      file: null,
      alt: "Taza roja",
    }

    expect(partitionMediaForUpload([picked]).stored).toEqual([
      { url: picked.url, isThumbnail: false, alt: "Taza roja" },
    ])
  })
})

describe("withRequestAlts", () => {
  it("gives each uploaded file the alt written for it, in upload order", () => {
    const uploads = [
      { id: "1-a.png", url: "http://localhost:9000/static/1-a.png" },
      { id: "1-b.png", url: "http://localhost:9000/static/1-b.png" },
    ]

    expect(
      withRequestAlts(uploads, [{ alt: "Taza roja" }, { alt: undefined }])
    ).toEqual([
      { ...uploads[0], alt: "Taza roja" },
      { ...uploads[1], alt: undefined },
    ])
  })
})

// Pagly: a product's main photo is always its first photo.
describe("firstPhotoIsMain", () => {
  it("marks the first photo as the main one, whatever was marked before", () => {
    expect(
      firstPhotoIsMain([
        { url: "a", isThumbnail: false },
        { url: "b", isThumbnail: true },
      ])
    ).toEqual([
      { url: "a", isThumbnail: true },
      { url: "b", isThumbnail: false },
    ])
  })

  it("marks the first photo when none was marked", () => {
    expect(firstPhotoIsMain([{ url: "a", isThumbnail: false }])).toEqual([
      { url: "a", isThumbnail: true },
    ])
  })
})

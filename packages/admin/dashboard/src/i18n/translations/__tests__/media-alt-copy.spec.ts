import { describe, expect, test } from "vitest"

import en from "../en.json"
import es from "../es.json"

/**
 * Pagly: the alt text field on product photos speaks plainly in both
 * languages: a label, a short missing mark and the failure toast.
 */
const media = (copy: unknown) =>
  (copy as { products: { media: Record<string, unknown> } }).products.media

describe("product photo alt copy", () => {
  test("Spanish names the field and its states in sentence case", () => {
    expect(media(es)).toMatchObject({
      altLabel: "Texto alternativo",
      altMissing: "Sin texto",
      altFailedToast:
        "Los medios se guardaron, pero no el texto alternativo. Probá de nuevo.",
    })
  })

  test("English has the same keys", () => {
    expect(media(en)).toMatchObject({
      altLabel: "Alt text",
      altMissing: "No alt text",
      altFailedToast: "Media saved, but not the alt text. Try again.",
    })
  })
})

// Settings-nav rig only (never committed): the worktree dashboard on :5271
// with a fake admin API, and Pagly's plugin pages stubbed from .claude/rigs.
import path from "path"
import { defineConfig, mergeConfig, type Plugin } from "vite"
import base from "./vite.config.mts"

const PORT = 5271
const NM = path.resolve(__dirname, "../../../node_modules")
const now = "2026-11-01T12:00:00.000Z"
const row = (id: string, extra: Record<string, unknown>) => ({
  id,
  created_at: now,
  updated_at: now,
  metadata: null,
  ...extra,
})

const LISTS: Record<string, [string, unknown[]]> = {
  "product-categories": [
    "product_categories",
    [
      row("pcat_1", { name: "Café en grano", handle: "cafe-en-grano", is_active: true, is_internal: false, rank: 0, parent_category_id: null, category_children: [] }),
      row("pcat_2", { name: "Café molido", handle: "cafe-molido", is_active: true, is_internal: false, rank: 1, parent_category_id: null, category_children: [] }),
      row("pcat_3", { name: "Accesorios", handle: "accesorios", is_active: true, is_internal: false, rank: 2, parent_category_id: null, category_children: [] }),
    ],
  ],
  "product-types": [
    "product_types",
    [row("ptyp_1", { value: "Café" }), row("ptyp_2", { value: "Accesorio" })],
  ],
  "product-tags": [
    "product_tags",
    [row("ptag_1", { value: "Orgánico" }), row("ptag_2", { value: "Origen único" }), row("ptag_3", { value: "Edición limitada" })],
  ],
  "return-reasons": [
    "return_reasons",
    [row("rr_1", { value: "danado", label: "Llegó dañado", description: null }), row("rr_2", { value: "no-esperado", label: "No era lo que esperaba", description: null })],
  ],
  "refund-reasons": [
    "refund_reasons",
    [row("refr_1", { label: "Error en el precio", code: "precio", description: null })],
  ],
}

const fakeApi = (): Plugin => ({
  name: "settings-nav-fake-api",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const url = new URL(req.url ?? "/", `http://localhost:${PORT}`)
      if (!url.pathname.startsWith("/admin/") && !url.pathname.startsWith("/auth/")) {
        return next()
      }
      const send = (body: unknown) => {
        res.setHeader("content-type", "application/json")
        res.end(JSON.stringify(body))
      }
      const p = url.pathname
      if (p === "/admin/users/me") {
        return send({ user: row("user_1", { email: "rig@pagly.test", first_name: "Agus", last_name: "", avatar_url: null, metadata: { lng: "es" } }) })
      }
      if (p === "/admin/stores") {
        return send({ stores: [row("store_1", { name: "Café Terracota", supported_currencies: [], default_region_id: null, default_sales_channel_id: null, default_location_id: null })], count: 1 })
      }
      const segment = p.replace(/^\/admin\//, "").split("/")[0]
      const list = LISTS[segment]
      if (list && p === `/admin/${segment}`) {
        return send({ [list[0]]: list[1], count: list[1].length, offset: 0, limit: 20 })
      }
      return send({ [segment.replace(/-/g, "_")]: [], count: 0, offset: 0, limit: 20 })
    })
  },
})

export default defineConfig((env) =>
  mergeConfig(base(env), {
    plugins: [fakeApi()],
    define: {
      __BACKEND_URL__: JSON.stringify(`http://localhost:${PORT}`),
      __AUTH_TYPE__: JSON.stringify("session"),
      __JWT_TOKEN_STORAGE_KEY__: JSON.stringify(""),
      __MAX_UPLOAD_FILE_SIZE__: "undefined",
    },
    resolve: {
      alias: {
        "@medusajs/admin-sdk": path.join(NM, "@medusajs/admin-sdk"),
        "@medusajs/ui": path.join(NM, "@medusajs/ui"),
      },
    },
    server: { open: false, port: PORT, strictPort: true, fs: { allow: [path.resolve(__dirname, "../../../.."), path.resolve(__dirname, "../../../../.claude")] } },
  })
)

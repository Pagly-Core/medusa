// Product page rig only (never committed): this worktree's dashboard on :5321,
// with /admin, /auth and /store proxied to the order-requests rig (:9985), so
// the redesigned product page reads real products on the same origin.
import path from "path"
import { defineConfig, mergeConfig } from "vite"
import base from "./vite.config.mts"

const PORT = 5321
const BACKEND = "http://localhost:9985"
const NM = path.resolve(__dirname, "../../../node_modules")
// The plugin's admin parts, from the pagly-app worktree (one React, one UI, one i18n).
process.env.VITE_MEDUSA_PROJECT = path.resolve(__dirname, "../../../../pagly-app-product-parts/packages/plugins/storefront/src/admin")
const one = (name: string) => path.join(NM, name)

export default defineConfig((env) =>
  mergeConfig(base(env), {
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
        "@pagly": path.resolve(__dirname, "../../../../pagly-app-product-parts/node_modules/@pagly"),
        "@medusajs/icons": one("@medusajs/icons"),
        "@medusajs/admin-shared": path.resolve(__dirname, "../admin-shared/dist/index.mjs"),
        react: one("react"),
        "react-dom": one("react-dom"),
        "react-router-dom": one("react-router-dom"),
        "react-i18next": one("react-i18next"),
        i18next: one("i18next"),
        "@tanstack/react-query": one("@tanstack/react-query"),
      },
    },
    // The plugin's CommonJS workspace packages, pre-bundled as apps/dev-server does.
    optimizeDeps: {
      include: [
        "@pagly/theme-document",
        "@pagly/notification-document",
        "@pagly/admin-ui",
        "@pagly/assistant-contract/dist/destinations",
        "@pagly/assistant-contract/dist/product-defaults",
        "@pagly/assistant-contract/dist/collection-rules",
        "@pagly/assistant-contract/dist/records",
        "@pagly/assistant-contract/dist/merchant-answer",
        "@pagly/assistant-contract/dist/provinces",
        "@pagly/assistant-contract/dist/free-over",
      ],
    },
    server: {
      open: false,
      port: PORT,
      strictPort: true,
      proxy: {
        "/admin": { target: BACKEND, changeOrigin: true },
        "/auth": { target: BACKEND, changeOrigin: true },
        "/store": { target: BACKEND, changeOrigin: true },
      },
      fs: { allow: [path.resolve(__dirname, "../../../..")] },
    },
  })
)

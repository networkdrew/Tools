import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { SITE_URL } from "./src/lib/config/site.ts";

export default defineConfig({
  site: SITE_URL,
  output: "static",
  integrations: [react(), sitemap()],
  // Static output + the Cloudflare adapter together means: prerender
  // everything (no SSR), but still emit the thin Worker entry Cloudflare's
  // Workers Static Assets deployment needs to serve dist/ (see wrangler.jsonc).
  adapter: cloudflare(),
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
      // onnxruntime-web's default export condition bundles its own ~24-27 MB
      // .wasm runtime as a same-origin asset -- Cloudflare Workers rejects any
      // static asset over 25 MiB, and even under that limit we don't want a
      // multi-megabyte binary shipped with the app bundle. This condition
      // selects onnxruntime-web's "extern wasm" build instead, which always
      // fetches its .wasm from wherever `ort.env.wasm.wasmPaths` points (see
      // src/islands/image-watermark-studio/aiModelLoader.ts) rather than
      // bundling one locally.
      conditions: ["onnxruntime-web-use-extern-wasm"],
    },
  },
});

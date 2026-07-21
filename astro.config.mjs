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
    },
  },
});

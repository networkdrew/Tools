# Deployment (Cloudflare Workers)

This account deploys via Cloudflare's Git-connected **Workers** integration (the modern unified successor to classic Cloudflare Pages), not the classic Pages "build command / output directory" dashboard settings. Deployment is entirely driven by `wrangler.jsonc` in the repo root — Cloudflare reads it directly, so there's no separate dashboard build configuration to keep in sync.

The site itself is still fully static (`output: "static"` in `astro.config.mjs`, every page prerendered, no SSR, no environment variables or secrets required). The `@astrojs/cloudflare` adapter and `wrangler.jsonc` exist only so Cloudflare's Workers platform knows how to serve that static output — there is no server-side application logic.

## Production target

- Production URL: **https://tools.drewcassidy.dev**
- This is a separate Cloudflare project from the existing `drewcassidy.dev` portfolio site. It must stay its own project, attached only to the `tools` subdomain — it does not touch the root domain's DNS record, project, or deployment.

## How the build maps to `wrangler.jsonc`

`npm run build` (`astro build`) produces:

- `dist/client/` — every static asset: HTML, CSS, JS, `robots.txt`, the sitemap, favicon. **This is what actually gets served.**
- `dist/server/` — a Cloudflare Worker entry Astro generates for the adapter's plumbing (routing/headers), not application logic.

`wrangler.jsonc` points Cloudflare at that split:

```jsonc
"assets": {
  "directory": "./dist/client", // must be dist/client, not dist — the adapter build always splits client/server
  "binding": "ASSETS",
},
```

**If this ever points at plain `./dist` instead of `./dist/client`, the deploy will build "successfully" but serve nothing usable** — this was the cause of a real broken-deployment incident on this project (Cloudflare's own auto-generated config PR guessed `./dist`; it needed correcting to `./dist/client` after the `@astrojs/cloudflare` adapter was added). If the site ever goes blank/404 again after a config change, check this value first.

The adapter also references a `SESSION` KV binding and an `IMAGES` binding by convention (visible in `wrangler deploy --dry-run` output) even though neither is declared in `wrangler.jsonc` and neither is used by any tool in this codebase (no `Astro.session`, no Cloudflare-Images-backed `astro:assets`). This is expected and harmless: Cloudflare auto-provisions bindings like this on deploy when referenced but undeclared (see [automatic provisioning](https://developers.cloudflare.com/workers/wrangler/configuration/#automatic-provisioning)) — nothing to configure manually.

## Verifying the config without deploying

`wrangler deploy --dry-run` bundles the Worker and validates `wrangler.jsonc` (including which config file it resolves to) without publishing anything or requiring you to be logged in for the dry run itself:

```
npm run build
npx wrangler deploy --dry-run
```

Look for `Configuration being used: dist\client\wrangler.json` (confirms the adapter's build-generated config was picked up) and `Read N files from the assets directory .../dist/client` (confirms the directory is correct).

## Connecting the project (first time)

1. Cloudflare dashboard → Workers & Pages → Create → **Workers** → connect this GitHub repository (not the classic "Pages" creation flow).
2. Cloudflare reads `wrangler.jsonc` automatically; no manual build command/output directory fields need to be set for this integration type.
3. Set **Production branch** to this repository's default branch on GitHub (currently `master`).
4. Deploy once to get a working `*.workers.dev` URL and confirm it actually serves the homepage (not just that the build step succeeded).
5. Add the custom domain: project → **Domains & Routes** → add `tools.drewcassidy.dev`. If `drewcassidy.dev` is already on this Cloudflare account, Cloudflare can create the DNS record automatically (a record for the `tools` subdomain only) — this does not modify the existing root domain's record, project, or deployment.
6. Wait for the domain to show "Active" before relying on it.

## Local development and previews

- `npm run dev` runs the plain Astro dev server; nothing here depends on Workers or the production URL.
- `npm run preview` builds and runs `wrangler dev` against the built output — closer to how the real Worker will behave than `astro preview` alone.
- Preview deployments still declare canonical/Open Graph URLs pointing at `https://tools.drewcassidy.dev` rather than the preview host — intentional, standard SEO practice so a preview build is never indexed as a separate page.

## Verifying a live deploy

After a deploy, check the actual served site, not just the build log:

- The homepage loads (not blank, not a Cloudflare error page). If it doesn't, check `assets.directory` in `wrangler.jsonc` first (see above).
- `/robots.txt` returns the expected content with the production `Sitemap:` URL.
- `/sitemap-index.xml` and `/sitemap-0.xml` list the production URLs for every tool/category page.
- A tool page's `<link rel="canonical">` and Open Graph tags point at `https://tools.drewcassidy.dev/...`, not a preview host.

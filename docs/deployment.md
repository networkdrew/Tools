# Deployment (Cloudflare Pages)

This is a fully static site (`astro.config.mjs` sets `output: "static"`) — no server, no adapter, no Cloudflare Functions required.

## Production target

- Production URL: **https://tools.drewcassidy.dev**
- This is a separate Cloudflare Pages project from the existing `drewcassidy.dev` portfolio site. It must be created as its own project and attached only to the `tools` subdomain — it does not touch the root domain's DNS record, project, or deployment.

## Cloudflare Pages project settings

| Setting                | Value                                                                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Framework preset       | Astro                                                                                                                                              |
| Build command          | `npm run build`                                                                                                                                    |
| Build output directory | `dist`                                                                                                                                             |
| Root directory         | `/` (repo root)                                                                                                                                    |
| Production branch      | This repository's default branch (currently `master`) — whichever branch is set as default on GitHub is what Cloudflare should deploy from.        |
| Node version           | Set env var `NODE_VERSION=22` (or higher — Astro 7 requires Node ≥ 22.12). Match whatever version you last verified `npm run verify` with locally. |

No environment variables are required for a production build — the canonical site URL is a source constant (`src/lib/config/site.ts`), not a runtime env var, by design (see `docs/architecture.md`).

## Connecting the custom domain

1. Create a new Cloudflare Pages project from this repository (Cloudflare dashboard → Workers & Pages → Create → Pages → connect to Git).
2. Set the build command/output directory above.
3. Deploy once to get a working `*.pages.dev` URL and confirm the build succeeds.
4. In the project's **Custom domains** tab, add `tools.drewcassidy.dev`.
5. If `drewcassidy.dev` is already on this Cloudflare account, Cloudflare will offer to create the DNS record automatically (a `CNAME` for the `tools` subdomain pointing at the Pages project). Accept that — it only adds a new subdomain record and does not modify the existing root domain's record, project, or deployment.
6. Wait for the domain to show "Active" in the Pages dashboard before relying on it.

## Local development and previews

- `npm run dev` runs the Astro dev server; nothing here depends on the production URL.
- Cloudflare Pages preview deployments (per-branch/per-PR `*.pages.dev` URLs) build the same way as production. Their HTML will still declare canonical/Open Graph URLs pointing at `https://tools.drewcassidy.dev` rather than the preview host — this is intentional, standard SEO practice (a preview build's canonical tag should point at the real production URL for that content, so search engines never index the preview host as a separate page).
- `npm run preview` serves the production build locally (via Astro's built-in static preview server) if you want to sanity-check the built output before pushing.

## Verifying a deploy

After a Cloudflare Pages build, spot-check:

- `/robots.txt` returns the expected content with the production `Sitemap:` URL.
- `/sitemap-index.xml` and `/sitemap-0.xml` list the production URLs for every tool/category page.
- A tool page's `<link rel="canonical">` and Open Graph tags point at `https://tools.drewcassidy.dev/...`, not the `*.pages.dev` preview host.

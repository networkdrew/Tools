# OpenToolbox

A free, privacy-first collection of browser-based tools — no accounts, no paid APIs for the core product, and no uploading your data to a server unless a tool's page explicitly says otherwise.

Production: https://tools.drewcassidy.dev

## Stack

Astro (static output) + React islands for interactive UI + TypeScript (strict) + Tailwind CSS v4 + Zod + Vitest/Testing Library. See `docs/architecture.md` for why, and `CLAUDE.md` for the durable working rules for this repo.

## Getting started

Requires Node.js ≥ 22.12 and npm.

```bash
npm install
npm run dev
```

The dev server prints a local URL (default `http://localhost:4321`).

## Scripts

| Command                  | What it does                                                                   |
| ------------------------ | ------------------------------------------------------------------------------ |
| `npm run dev`            | Local dev server with hot reload                                               |
| `npm run build`          | Production build — static output to `dist/client/`                             |
| `npm run preview`        | Build, then run the built output locally under `wrangler dev`                  |
| `npm run check`          | Astro + TypeScript type checking                                               |
| `npm run lint`           | ESLint (`--fix` variant: `npm run lint:fix`)                                   |
| `npm run format:check`   | Prettier check (`npm run format` to write)                                     |
| `npm run test`           | Vitest — all unit and component tests, run once                                |
| `npm run test:watch`     | Vitest in watch mode                                                           |
| `npm run verify`         | Runs format check, lint, type check, tests, and build in sequence              |
| `npm run generate-types` | Regenerates `worker-configuration.d.ts` from `wrangler.jsonc`                  |
| `npm run deploy`         | Build, then `wrangler deploy` (manual/local deploy — CI normally handles this) |

Run `npm run verify` before considering any change finished.

Note: `npm run build` writes static assets to `dist/client/` (not `dist/` directly) — the `@astrojs/cloudflare` adapter always splits output into `dist/client/` (what gets served) and `dist/server/` (Worker plumbing). See `docs/deployment.md`.

## Adding a new tool

See `docs/adding-a-tool.md` — it's a fixed, five-step recipe (logic → UI → wire into the island loader → registry entry → verify), backed by tests that fail if a step is skipped.

## Deployment (Cloudflare Workers)

The site is still fully static (`output: "static"`, no server-side logic, no environment variables or secrets required) — but it deploys via Cloudflare's Git-connected **Workers** integration, driven entirely by `wrangler.jsonc` in the repo root, rather than the classic Cloudflare Pages "build command / output directory" dashboard fields:

| Setting            | Value                                                                               |
| ------------------ | ----------------------------------------------------------------------------------- |
| Framework / preset | Astro, deployed as a Worker (`@astrojs/cloudflare` adapter + `wrangler.jsonc`)      |
| Build command      | `npm run build`                                                                     |
| Assets directory   | `dist/client` (set in `wrangler.jsonc` → `assets.directory` — **not** plain `dist`) |
| Root directory     | Repository root (`/`)                                                               |
| Production branch  | This repository's default branch (currently `master`)                               |

See `docs/deployment.md` for the full walkthrough — including why `dist/client` (not `dist`) matters, how to validate the config with `wrangler deploy --dry-run` before publishing, and connecting the `tools.drewcassidy.dev` custom domain without touching the existing `drewcassidy.dev` project.

## Documentation

- `docs/architecture.md` — the tool registry, why tool islands are wired the way they are, directory layout, theming, search.
- `docs/adding-a-tool.md` — the exact steps to add a tool.
- `docs/roadmap.md` — what's shipped, what's next, what's deliberately out of scope.
- `docs/deployment.md` — Cloudflare Workers deployment mechanics (`wrangler.jsonc`, the `dist/client` split) and custom domain setup.
- `CLAUDE.md` — durable project rules for AI-assisted development in this repo.

## Privacy

Every tool page states its execution mode. Tools marked "runs in your browser" process input entirely client-side using standard web platform APIs (e.g. `JSON.parse`, `crypto.getRandomValues`, `TextEncoder`/`TextDecoder`) — nothing you type or paste into them is sent to a server, logged, or stored beyond the current page load. There is no analytics or tracking script in this codebase.

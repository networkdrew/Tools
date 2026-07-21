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

| Command                | What it does                                                      |
| ---------------------- | ----------------------------------------------------------------- |
| `npm run dev`          | Local dev server with hot reload                                  |
| `npm run build`        | Production build to `dist/`                                       |
| `npm run preview`      | Serve the production build locally                                |
| `npm run check`        | Astro + TypeScript type checking                                  |
| `npm run lint`         | ESLint (`--fix` variant: `npm run lint:fix`)                      |
| `npm run format:check` | Prettier check (`npm run format` to write)                        |
| `npm run test`         | Vitest — all unit and component tests, run once                   |
| `npm run test:watch`   | Vitest in watch mode                                              |
| `npm run verify`       | Runs format check, lint, type check, tests, and build in sequence |

Run `npm run verify` before considering any change finished.

## Adding a new tool

See `docs/adding-a-tool.md` — it's a fixed, five-step recipe (logic → UI → wire into the island loader → registry entry → verify), backed by tests that fail if a step is skipped.

## Deployment (Cloudflare Pages)

This is a fully static site (`output: "static"` in `astro.config.mjs`, no adapter, no server runtime) deployed to Cloudflare Pages from this GitHub repository. When creating the Cloudflare Pages project, use:

| Setting                | Value                                                 |
| ---------------------- | ----------------------------------------------------- |
| Framework preset       | Astro                                                 |
| Build command          | `npm run build`                                       |
| Build output directory | `dist`                                                |
| Root directory         | Repository root (`/`)                                 |
| Production branch      | This repository's default branch (currently `master`) |

No environment variables or secrets are required to build or run this site. See `docs/deployment.md` for the full walkthrough, including connecting the `tools.drewcassidy.dev` custom domain without touching the existing `drewcassidy.dev` project.

## Documentation

- `docs/architecture.md` — the tool registry, why tool islands are wired the way they are, directory layout, theming, search.
- `docs/adding-a-tool.md` — the exact steps to add a tool.
- `docs/roadmap.md` — what's shipped, what's next, what's deliberately out of scope.
- `docs/deployment.md` — Cloudflare Pages project settings and custom domain setup.
- `CLAUDE.md` — durable project rules for AI-assisted development in this repo.

## Privacy

Every tool page states its execution mode. Tools marked "runs in your browser" process input entirely client-side using standard web platform APIs (e.g. `JSON.parse`, `crypto.getRandomValues`, `TextEncoder`/`TextDecoder`) — nothing you type or paste into them is sent to a server, logged, or stored beyond the current page load. There is no analytics or tracking script in this codebase.

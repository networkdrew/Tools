# OpenToolbox — Claude Code Instructions

## Mission

Build a trustworthy, privacy-first collection of free browser tools. Favor useful working software over marketing decoration.

## Stack

Astro (static output) + React islands for interactive tool UIs + TypeScript (strict) + Tailwind CSS v4 + Zod + Vitest + Testing Library. Package manager is npm. Deployed as a fully static site to Cloudflare Workers (Git-connected, `wrangler.jsonc`-driven) — see `docs/deployment.md`. If `wrangler.jsonc`, `astro.config.mjs`'s adapter, or the build's `dist/client` split ever changes, re-verify a deploy actually serves pages, not just that `npm run build` succeeds.

## Project principles

- Core tools must not require paid APIs.
- Prefer local browser processing; never transmit user content silently.
- Never claim a tool is private unless its implementation supports that claim.
- Never add fake reviews, statistics, users, companies, downloads, ratings, or testimonials.
- Never leave visible controls nonfunctional.
- Keep the application statically deployable unless a reviewed feature requires a backend.
- Preserve stable tool URLs and registry IDs — never reuse or repurpose one.
- Accessibility, mobile behavior, performance, and error handling are required, not optional polish.

## Before changing code

- Inspect the relevant implementation, tests, and nearby patterns.
- Understand the root cause or requested behavior before editing.
- Reuse established components and conventions (see `docs/architecture.md`).
- Keep changes focused; do not rewrite unrelated working code.
- State assumptions when requirements are genuinely ambiguous.

## Architecture

- `src/lib/tools/registry.ts` is the single authoritative source of tool metadata. Nothing else should hardcode a tool's name, description, or category.
- `src/components/react/ToolIslandLoader.tsx` maps each registry tool `id` to its React island. **Astro cannot hydrate a component reached only through a runtime/dynamic import stored in data** — it needs a static import it can see at compile time. That's why this indirection exists; see the comment in that file before changing how tools are wired up.
- Pure tool logic lives under `src/lib/tools-logic/<tool>/` with colocated `*.test.ts` files, completely separate from the React UI in `src/islands/`. Keep it that way — logic should be testable without rendering anything.
- Shared layouts (`src/layouts/`), controls (`src/components/react/styles.ts`, `CopyButton`, `DownloadButton`, `StatusMessage`), and the tool-page shell (`ToolLayout.astro`) exist so every tool looks and behaves consistently. Reuse them instead of one-off markup.
- Do not add a dependency when a small, clear implementation is safer.
- Do not introduce a backend, database, authentication, analytics, or external API without explicit justification and a documented, accurate privacy claim.
- `src/lib/config/site.ts` is the only place the production URL and site identity constants live. `astro.config.mjs` imports `SITE_URL` from it.

## Quality requirements

- Use strict TypeScript; avoid `any` unless documented and unavoidable.
- Validate external and user-controlled input (see the `zod` schemas in `src/lib/tools/schema.ts` and the `ok`/error-result pattern used by every tool-logic module).
- Provide accessible labels, focus states, keyboard behavior, and status messages (`role="alert"` / `role="status"`) for every interactive control.
- Respect `prefers-reduced-motion` (already handled globally in `src/styles/global.css` — don't add animations that bypass it).
- Prevent avoidable layout shift.
- Do not log or persist sensitive user content.
- Write or update tests for meaningful behavior and bug fixes. Every tool needs logic tests; UI wiring tests (Testing Library) are expected for anything with real interaction branches.
- Treat warnings as problems to investigate.

## Verification

Run before calling anything done:

```
npm run format:check
npm run lint
npm run check      # astro check — type checking
npm run test
npm run build
```

`npm run verify` runs all five in sequence. Do not report success unless these actually pass. When browser tooling is available, test the primary desktop and mobile workflows in a real browser.

## Git and safety

- Work only inside this repository.
- Never commit secrets, local credentials, generated user content, or environment files containing secrets.
- Do not use destructive Git commands or erase user work.
- Do not change deployment, billing, domains, or external accounts without explicit approval.
- Keep commits focused and descriptive when commits are requested.

## Communication

- Be concise but surface important decisions, risks, and failures.
- Prefer implementing and verifying over proposing excessive options.
- At completion, summarize changes, verification, known limitations, and the single best next task.

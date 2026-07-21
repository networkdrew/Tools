# Roadmap

A lightweight, honest list — not a commitment with dates. See `docs/adding-a-tool.md` for how new tools get added.

## Shipped (v0.1 — foundation)

- Site shell: header/footer, responsive nav, theme switcher, Cmd/Ctrl+K search, skip link.
- Homepage: search, category browsing, featured/recent tools, privacy explanation.
- Searchable/filterable tool directory and category pages.
- Reusable tool-page system (`ToolLayout`) with privacy badge, usage notes, related tools.
- Typed, validated tool registry as the single source of content truth.
- Five fully working tools: JSON formatter/validator/minifier, password/passphrase generator, text statistics & cleanup, Unix timestamp converter, Base64 encoder/decoder.
- SEO: per-page canonical/OG/Twitter meta, JSON-LD, sitemap, robots.txt.
- Automated tests for every tool's logic and UI, plus registry integrity checks.

## Next up (not yet built)

- More tools across the categories in the product brief: image compression/resize/crop, PDF merge/split/compress, QR/barcode generation, CSV/Markdown utilities, a color contrast checker, mock data generation.
- A working "suggest a tool" path (deferred deliberately for v0.1 — no placeholder was shipped in its place).
- Playwright end-to-end smoke tests for the primary flows (search → tool → use → copy), on top of the current Vitest/Testing Library coverage.
- Per-tool Open Graph images instead of one shared default.
- A11y pass with a screen reader on the search palette and mobile nav specifically (built to the axe/keyboard-accessible pattern, but not yet screen-reader-tested by a human).

## Deliberately not planned

- Accounts, sign-in, or any per-user storage.
- A backend/database for the core tools — only add one for a specific future tool that genuinely can't work client-side, and say so explicitly on that tool's page.
- Ads or tracking scripts.
- A native/desktop app, unless a genuinely offline-capable paid edition becomes worth building later (see the product vision's monetization note) — not started.

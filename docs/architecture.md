# Architecture

## Stack and why

- **Astro, static output (`output: "static"`).** Every page is pre-rendered HTML at build time — good for SEO, good for Cloudflare Pages, and it means most of the site ships zero JavaScript by default. Astro's "islands" model lets individual interactive widgets opt into hydration without turning the whole page into a client-rendered app.
- **React, only for islands.** The handful of components that need real interactivity (a tool's UI, the theme toggle, the search palette) are React components hydrated on the client. Everything else — layouts, headers, footers, cards — is plain `.astro` markup with no client JS cost.
- **Tailwind CSS v4.** Utility classes plus a small set of CSS custom-property design tokens (`src/styles/global.css`) for light/dark theming. No component library — cards, buttons, and form fields are a handful of shared Tailwind class strings (`src/components/react/styles.ts`) plus a few Astro components, which is enough for this surface area.
- **Zod.** Validates the tool and category registries at module-load time, so a malformed entry fails immediately and loudly instead of silently breaking a page.
- **Vitest + Testing Library.** Fast, Vite-native, no separate config split between unit and component tests.

## The tool registry

`src/lib/tools/registry.ts` is the single source of truth for every tool's metadata: name, description, category, tags/aliases, related tools, usage notes, and SEO copy. `src/lib/tools/categories.ts` is the same for categories. Nothing else in the codebase should hardcode a tool's name or description — pages, the search index, the sitemap, and the homepage's featured/recent sections all read from these two files.

Both are validated against Zod schemas (`src/lib/tools/schema.ts`) at import time, and `registry.test.ts` / category tests enforce integrity rules that are easy to violate by hand: unique ids, unique slugs, no dangling `relatedTools` references, no empty categories, valid dates.

## Why tool UIs are wired through `ToolIslandLoader`

Astro decides what to hydrate on the client by statically analyzing the imports in an `.astro` file — it cannot follow a dynamic `import()` stored inside a plain data structure (like a registry entry) back to a real module. An earlier version of this registry stored a `load: () => import(...)` function per tool, which worked fine for Vite's bundler but broke Astro's build with `NoMatchingImport`, because `[slug].astro` only ever saw a variable, not a literal import.

The fix is `src/components/react/ToolIslandLoader.tsx`: it's the **one** component `[slug].astro` statically imports and hydrates (`<ToolIslandLoader toolId={tool.id} client:load />`). Internally, it holds a small map from tool `id` to `React.lazy(() => import("@/islands/XyzTool"))`. Vite still code-splits each tool into its own chunk (verified in the build output — each tool's JS only appears on its own page), and Astro only has to understand one static import. `ToolIslandLoader.test.tsx` asserts the map's keys exactly match the registry's ids, so adding a tool to one without the other fails a test instead of silently 404-ing at runtime.

## Directory layout

```
src/
  components/
    astro/       Server-rendered building blocks (Header, Footer, ToolCard, Icon, ...)
    react/        Shared interactive primitives (CopyButton, ThemeToggle, SearchPalette, ...)
  islands/         One React component per tool's interactive UI
  layouts/         BaseLayout (document shell, SEO) and ToolLayout (tool-page chrome)
  lib/
    config/        site.ts (identity/URLs), theme.ts (theme-init script)
    tools/          registry.ts, categories.ts, schema.ts, search.ts — the content model
    tools-logic/    Pure, framework-free logic per tool, colocated with its tests
  pages/            Astro file-based routes
  styles/           global.css — design tokens, Tailwind entry, base styles
docs/                This file, the tool-adding recipe, the roadmap, deployment notes
```

## Search

`src/lib/tools/search.ts` builds a [Fuse.js](https://www.fuse.js.org/) index over tool name, aliases, tags, short description, and category name, weighted so a name match ranks above an incidental description match. It's used by both the header's `SearchPalette` (a Cmd/Ctrl+K modal) and the `/tools` directory's filter UI — same index, two presentations.

## Directory page: a deliberate SEO tradeoff

The `/tools` directory's search and category filtering are a client-rendered React island (`ToolDirectory.tsx`), not a static + progressively-enhanced list. That means a crawler that doesn't execute JavaScript won't see the full tool list _on that specific page_. This is intentional: every tool already has its own fully static, indexable page at `/tools/<slug>/`, every category page (`/categories/<id>/`) statically lists its tools with real `<a>` links, and the sitemap (`@astrojs/sitemap`) includes all of them directly. The directory page's job is being a fast, instant-feeling UX for actual visitors; it doesn't need to also be the crawl path.

## Theming

Light/dark is driven by a `data-theme="light"|"dark"` attribute on `<html>`, read from `localStorage` by a small inline script in `BaseLayout`'s `<head>` (before first paint, so there's no flash). If nothing is stored, CSS falls back to `prefers-color-scheme`. `ThemeToggle.tsx` is mounted with `client:only="react"` since its initial state depends on `matchMedia`/`localStorage`, which don't exist during Astro's static render — there is nothing meaningful to server-render for this component.

## Centralized site configuration

`src/lib/config/site.ts` exports `SITE_URL` (the production canonical origin), `SITE_NAME`, `SITE_DESCRIPTION`, and nav links. `astro.config.mjs` imports `SITE_URL` from this file to set Astro's `site` config, which is what powers canonical links, Open Graph URLs, and the sitemap. Change the production URL in exactly one place: `src/lib/config/site.ts`.

# Adding a new tool

This is the full, predictable set of steps. Read `docs/architecture.md` first if you haven't — it explains _why_ the registry and `ToolIslandLoader` work the way they do.

Use the existing Base64 tool (`src/lib/tools-logic/base64/`, `src/islands/Base64Tool.tsx`) as a template if you want to see every piece in one place.

## 1. Write the pure logic first

Create `src/lib/tools-logic/<tool-name>/*.ts` with plain, framework-free functions. Follow the existing `{ ok: true, value } | { ok: false, message }` result pattern used by every other tool (see `src/lib/tools-logic/json/format.ts`) so error handling stays consistent.

Write `*.test.ts` next to it covering: the normal case, empty/whitespace input, malformed input, and any Unicode/edge cases relevant to the tool. Run `npm run test` until it's green before moving on — it's much faster to get the logic right in isolation than inside a React component.

## 2. Build the island UI

Create `src/islands/<ToolName>Tool.tsx` — a default-exported React component with **no required props** (it's rendered as `<Component />` with nothing passed in). Reuse:

- `src/components/react/styles.ts` for button/input/textarea class strings
- `CopyButton`, `DownloadButton`, `StatusMessage` from `src/components/react/`
- The `ok`/`message`/`line`/`column` shape your logic module returns, for validation and error display

Every tool needs a working **Reset** action, accessible labels on every input, and `role="alert"` (via `StatusMessage`) for errors.

Write a `*.test.tsx` next to it using Testing Library: the happy path, an error path, and Reset. Use `fireEvent.change` (not `userEvent.type`) for any input containing `{`, `}`, or other characters `userEvent`'s keyboard parser treats as special.

## 3. Wire it into `ToolIslandLoader`

Add one line to the map in `src/components/react/ToolIslandLoader.tsx`:

```ts
"<tool-id>": lazy(() => import("@/islands/<ToolName>Tool")),
```

`ToolIslandLoader.test.tsx` will fail if you forget this (or if you add it without a matching registry entry), so you can't silently ship a broken tool page.

## 4. Add the registry entry

Add an object to `rawTools` in `src/lib/tools/registry.ts`:

- `id` / `slug`: kebab-case, and **permanent** — don't reuse or repurpose an id later.
- `categoryId`: must match an existing entry in `src/lib/tools/categories.ts`, or add a new category there (only if this tool doesn't fit an existing one).
- `tags` / `aliases`: real search terms people would type, including the "wrong" wording (e.g. "json beautifier" as well as "json formatter").
- `executionMode`: `"browser"` unless the tool genuinely needs a server round-trip, in which case the tool page's privacy badge will say so automatically — make sure that's actually true before setting it.
- `addedAt`: today's date (`YYYY-MM-DD`). Tools show a "New" badge for 30 days from this date.
- `usageNotes`: 2-4 short, concrete, honest tips — not marketing copy.
- `seo.description`: one sentence, used as the page's meta description and Open Graph description.

`npm run test` runs `registry.test.ts`, which checks: unique ids/slugs, valid category references, valid `relatedTools` references, no self-referencing related tools, and non-future dates. Fix whatever it flags.

## 5. Verify

```
npm run test
npm run check
npm run build
npm run dev   # click through the new tool page manually, including on a narrow viewport
```

Confirm: the tool page renders at `/tools/<slug>/`, it appears on `/tools/`, it appears under its category page, Reset actually resets, and invalid input shows a real error message rather than a stack trace or silent failure.

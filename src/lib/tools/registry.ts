import { toolMetaSchema, type ToolMeta } from "./schema";

/**
 * The authoritative list of every tool on the site. Nothing else defines
 * tool metadata — pages, search, sitemaps, and nav all read from here.
 * See docs/adding-a-tool.md for the steps to add a new entry.
 */
const rawTools = [
  {
    id: "json-formatter",
    slug: "json-formatter",
    name: "JSON Formatter & Validator",
    shortDescription:
      "Format, validate, and minify JSON with clear, exact error messages.",
    description: [
      "Paste in JSON to pretty-print it with consistent indentation, collapse it to a single compact line, or find out exactly where it's malformed.",
      "Everything runs in your browser using the standard JSON parser built into JavaScript — your data is never sent anywhere.",
    ],
    categoryId: "developer-tools",
    tags: ["json", "formatter", "validator", "minifier", "pretty print"],
    aliases: [
      "json beautifier",
      "json pretty print",
      "json linter",
      "json to text",
    ],
    executionMode: "browser",
    featured: true,
    addedAt: "2026-07-20",
    relatedTools: ["base64-encoder-decoder"],
    usageNotes: [
      "Formatting uses 2-space indentation; minifying removes all non-essential whitespace.",
      "Syntax errors show the line and column reported by the parser so you can jump straight to the problem.",
      "Large files (multiple megabytes) may take a moment to parse — nothing is uploaded while that happens.",
    ],
    seo: {
      description:
        "Free JSON formatter, validator, and minifier that runs entirely in your browser. Pretty-print, minify, and get precise syntax error locations.",
    },
  },
  {
    id: "password-generator",
    slug: "password-generator",
    name: "Password & Passphrase Generator",
    shortDescription:
      "Create strong random passwords or memorable passphrases using your browser's crypto.",
    description: [
      "Generate random passwords with the character sets you choose, or word-based passphrases that are easier to type and remember.",
      "Randomness comes from the Web Crypto API (crypto.getRandomValues), the same cryptographically secure source browsers use for security-sensitive code — not Math.random().",
    ],
    categoryId: "security-privacy",
    tags: [
      "password",
      "passphrase",
      "generator",
      "random",
      "security",
      "crypto",
    ],
    aliases: [
      "random password generator",
      "secure password maker",
      "passphrase generator",
      "strong password generator",
    ],
    executionMode: "browser",
    featured: true,
    addedAt: "2026-07-20",
    relatedTools: [],
    usageNotes: [
      "Passphrases are built from a fixed offline word list — no dictionary lookups leave your browser.",
      "The strength estimate is based on entropy (bits of randomness), not on matching known-weak password lists.",
      "Nothing you generate here is stored, logged, or transmitted — refreshing the page clears it for good.",
    ],
    seo: {
      description:
        "Generate cryptographically secure passwords and passphrases in your browser using the Web Crypto API. Nothing is transmitted or stored.",
    },
  },
  {
    id: "text-stats-cleanup",
    slug: "text-stats-cleanup",
    name: "Text Statistics & Cleanup",
    shortDescription:
      "Count words, characters, and sentences, then clean up messy text.",
    description: [
      "Get instant counts of words, characters, sentences, and paragraphs, plus an estimated reading time as you type or paste.",
      "Use the cleanup actions to collapse extra whitespace, strip line breaks, or change case without leaving your browser.",
    ],
    categoryId: "text-writing",
    tags: [
      "text",
      "word count",
      "character count",
      "cleanup",
      "whitespace",
      "reading time",
    ],
    aliases: [
      "word counter",
      "character counter",
      "text cleaner",
      "line break remover",
    ],
    executionMode: "browser",
    featured: false,
    addedAt: "2026-07-20",
    relatedTools: ["json-formatter"],
    usageNotes: [
      "Reading time assumes 200 words per minute, a common average for adult silent reading.",
      "Sentence counting is a heuristic based on punctuation and won't be perfect for every writing style.",
      "Cleanup actions edit the text in place — use Reset if you want to get back to what you started with.",
    ],
    seo: {
      description:
        "Free text statistics and cleanup tool: word count, character count, reading time, and whitespace cleanup, entirely in your browser.",
    },
  },
  {
    id: "timestamp-converter",
    slug: "timestamp-converter",
    name: "Unix Timestamp Converter",
    shortDescription:
      "Convert between Unix timestamps and human-readable dates in any timezone.",
    description: [
      "Paste a Unix timestamp (seconds or milliseconds) to see the matching date and time, or go the other way from a date.",
      "Conversion uses your browser's built-in time zone database, so results reflect your local time zone as well as UTC.",
    ],
    categoryId: "converters",
    tags: ["timestamp", "unix time", "date", "epoch", "converter"],
    aliases: [
      "epoch converter",
      "unix time converter",
      "date to timestamp",
      "timestamp to date",
    ],
    executionMode: "browser",
    featured: false,
    addedAt: "2026-07-20",
    relatedTools: [],
    usageNotes: [
      "Timestamps in seconds (10 digits, e.g. 1737331200) and milliseconds (13 digits) are both detected automatically.",
      "The live clock updates once per second and pauses automatically if you switch to another browser tab.",
    ],
    seo: {
      description:
        "Convert Unix timestamps to human-readable dates and back, in UTC or your local time zone, entirely in your browser.",
    },
  },
  {
    id: "base64-encoder-decoder",
    slug: "base64-encoder-decoder",
    name: "Base64 Encoder & Decoder",
    shortDescription:
      "Encode text to Base64 or decode Base64 back to readable text.",
    description: [
      "Convert plain text (including emoji and non-English characters) to Base64, or decode Base64 back to text.",
      "Encoding and decoding happen with the browser's native Base64 support — nothing is sent to a server.",
    ],
    categoryId: "developer-tools",
    tags: ["base64", "encode", "decode", "converter"],
    aliases: ["base64 converter", "base64 to text", "text to base64"],
    executionMode: "browser",
    featured: false,
    addedAt: "2026-07-20",
    relatedTools: ["json-formatter"],
    usageNotes: [
      "Text is treated as UTF-8, so accented letters, emoji, and non-Latin scripts round-trip correctly.",
      "An optional URL-safe mode swaps + and / for - and _ and drops padding, for use in URLs and filenames.",
      "Decoding invalid Base64 shows an error instead of silently producing garbage output.",
    ],
    seo: {
      description:
        "Free Base64 encoder and decoder that works entirely in your browser, with full UTF-8 and URL-safe support.",
    },
  },
  {
    id: "qr-code-generator",
    slug: "qr-code-generator",
    name: "QR Code Generator",
    shortDescription:
      "Turn any text or URL into a downloadable QR code, PNG or SVG.",
    description: [
      "Paste in a URL, Wi-Fi string, vCard, or any other text and get a scannable QR code you can download as a PNG or a resolution-independent SVG.",
      "The QR code is built entirely in your browser — nothing you type is sent anywhere, so it's safe to use for links you haven't published yet or details you'd rather not put through a third-party generator.",
    ],
    categoryId: "converters",
    tags: [
      "qr code",
      "qr generator",
      "qr code maker",
      "barcode",
      "url to qr code",
    ],
    aliases: [
      "generate qr code",
      "qr code creator",
      "text to qr code",
      "make a qr code",
    ],
    executionMode: "browser",
    featured: true,
    addedAt: "2026-07-20",
    relatedTools: ["base64-encoder-decoder"],
    usageNotes: [
      "Higher error correction levels make the code more resistant to smudges or damage, but require more modules for the same text.",
      "Very long text may not fit at higher error correction levels — try Low or Medium first, or shorten the text.",
      "Text is encoded as raw UTF-8 bytes (no explicit encoding marker), which every mainstream QR scanner reads correctly, though a few very old scanners may misread non-Latin scripts or emoji.",
    ],
    seo: {
      description:
        "Free QR code generator that runs entirely in your browser. Turn text or URLs into a downloadable PNG or SVG QR code — nothing is uploaded.",
    },
  },
  {
    id: "color-contrast-checker",
    slug: "color-contrast-checker",
    name: "Color Contrast Checker",
    shortDescription:
      "Check text and background color pairs against WCAG 2.1 contrast requirements.",
    description: [
      "Enter a text color and a background color (hex, rgb()/rgba(), or a basic color name) to see the exact contrast ratio and whether it passes WCAG 2.1 AA and AAA for normal text, large text, and UI components.",
      "Everything is computed locally with the standard WCAG relative-luminance formula — your colors are never sent anywhere.",
    ],
    categoryId: "accessibility",
    tags: [
      "color contrast",
      "wcag",
      "accessibility",
      "contrast ratio",
      "contrast checker",
    ],
    aliases: [
      "contrast ratio checker",
      "wcag contrast checker",
      "accessible color checker",
      "text contrast checker",
    ],
    executionMode: "browser",
    featured: false,
    addedAt: "2026-07-20",
    relatedTools: [],
    usageNotes: [
      "4.5:1 is the WCAG AA minimum for normal text; 3:1 applies to large text (18pt+, or 14pt+ bold) and UI components.",
      "Semi-transparent colors are flattened against an assumed white page background before the ratio is calculated — results may differ if your real background isn't white.",
      "Passing AA is the widely-required baseline; AAA is a stricter, optional target for higher-contrast content.",
    ],
    seo: {
      description:
        "Free WCAG 2.1 color contrast checker that runs entirely in your browser. Check text and background color pairs against AA and AAA thresholds.",
    },
  },
] as const;

export const tools: readonly ToolMeta[] = rawTools.map((t) =>
  toolMetaSchema.parse(t),
);

export function getToolBySlug(slug: string): ToolMeta | undefined {
  return tools.find((t) => t.slug === slug);
}

export function getFeaturedTools(): ToolMeta[] {
  return tools.filter((t) => t.featured);
}

export function getRecentTools(limit = 4): ToolMeta[] {
  return [...tools]
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
    .slice(0, limit);
}

export function getToolsByCategory(categoryId: string): ToolMeta[] {
  return tools.filter((t) => t.categoryId === categoryId);
}

export function getRelatedTools(tool: ToolMeta): ToolMeta[] {
  return tool.relatedTools
    .map((id) => tools.find((t) => t.id === id))
    .filter((t): t is ToolMeta => t !== undefined);
}

const NEW_WINDOW_DAYS = 30;

export function isNewTool(tool: ToolMeta, now = new Date()): boolean {
  const added = new Date(`${tool.addedAt}T00:00:00Z`);
  const ageMs = now.getTime() - added.getTime();
  return ageMs >= 0 && ageMs <= NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
}

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
    relatedTools: ["base64-encoder-decoder", "csv-json-converter"],
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
  {
    id: "image-compressor",
    slug: "image-compressor",
    name: "Image Compressor",
    shortDescription:
      "Shrink JPEG, PNG, and WebP images and optionally resize them, without uploading anything.",
    description: [
      "Choose a JPEG, PNG, or WebP image to re-encode it at a smaller file size, resize it by percentage or to fit within maximum dimensions, and download the result.",
      "Everything happens locally using the browser's Canvas API — your image is decoded, redrawn, and re-encoded on your device and is never uploaded anywhere.",
    ],
    categoryId: "images-media",
    tags: [
      "image compressor",
      "image resizer",
      "compress image",
      "resize image",
      "jpeg",
      "png",
      "webp",
    ],
    aliases: [
      "reduce image size",
      "shrink image",
      "image optimizer",
      "photo compressor",
    ],
    executionMode: "browser",
    featured: true,
    addedAt: "2026-07-20",
    relatedTools: [
      "qr-code-generator",
      "image-format-converter",
      "image-metadata-remover",
    ],
    usageNotes: [
      "JPEG and WebP use the quality slider to trade file size for detail; PNG is always lossless, so quality doesn't apply to it.",
      "Resizing never enlarges an image beyond its original dimensions — 'fit within' only ever shrinks.",
      "Animated GIFs and SVGs aren't supported here: re-encoding through canvas would flatten animation or vector paths into a single raster frame.",
      "Files over 25 MB are rejected to avoid freezing the tab on lower-powered devices.",
    ],
    seo: {
      description:
        "Free image compressor that runs entirely in your browser. Shrink and resize JPEG, PNG, and WebP images with nothing ever uploaded.",
    },
  },
  {
    id: "image-format-converter",
    slug: "image-format-converter",
    name: "Image Format Converter",
    shortDescription:
      "Convert PNG, JPEG, WebP, BMP, or GIF images to PNG, JPEG, or WebP, without uploading anything.",
    description: [
      "Choose a PNG, JPEG, WebP, BMP, or GIF image to convert it to PNG, JPEG, or WebP, preview the result, and download it.",
      "Everything happens locally using the browser's Canvas API — your image is decoded, redrawn, and re-encoded on your device and is never uploaded anywhere.",
    ],
    categoryId: "images-media",
    tags: [
      "image converter",
      "convert image",
      "png to jpeg",
      "jpeg to png",
      "webp converter",
      "gif to png",
      "bmp converter",
    ],
    aliases: [
      "image format converter",
      "convert image format",
      "png converter",
      "webp to png",
    ],
    executionMode: "browser",
    featured: false,
    addedAt: "2026-07-20",
    relatedTools: ["image-compressor", "image-metadata-remover"],
    usageNotes: [
      "JPEG doesn't support transparency — converting a transparent PNG, WebP, or GIF to JPEG fills transparent areas with white, and the tool warns you before you convert.",
      "Animated GIFs and animated WebP images are flattened to their first frame; the tool detects and warns about this before you convert.",
      "Quality only applies to JPEG and WebP output — PNG output is always lossless.",
      "Files over 25 MB are rejected to avoid freezing the tab on lower-powered devices.",
    ],
    seo: {
      description:
        "Free image format converter that runs entirely in your browser. Convert PNG, JPEG, WebP, BMP, or GIF images to PNG, JPEG, or WebP with nothing uploaded.",
    },
  },
  {
    id: "csv-json-converter",
    slug: "csv-json-converter",
    name: "CSV ↔ JSON Converter",
    shortDescription:
      "Convert CSV to JSON or JSON to CSV, with custom delimiters and header handling.",
    description: [
      "Paste CSV to turn it into an array of JSON objects (or arrays, if there's no header row), or paste a JSON array of objects to turn it into a CSV table.",
      "Parsing and conversion happen entirely in your browser — nothing you paste is uploaded or sent anywhere.",
    ],
    categoryId: "developer-tools",
    tags: [
      "csv",
      "json",
      "converter",
      "csv to json",
      "json to csv",
      "spreadsheet",
    ],
    aliases: [
      "csv converter",
      "csv parser",
      "json to csv converter",
      "csv to json converter",
    ],
    executionMode: "browser",
    featured: false,
    addedAt: "2026-07-20",
    relatedTools: ["json-formatter"],
    usageNotes: [
      'Quoted fields, embedded commas, and escaped quotes ("") are handled per the standard CSV format — not just simple comma-splitting.',
      "Comma, semicolon, and tab delimiters are all supported for both directions.",
      "When converting JSON to CSV, columns are the union of every object's keys in first-seen order; missing fields become empty cells, and nested objects/arrays are stringified into a single cell.",
    ],
    seo: {
      description:
        "Free CSV to JSON and JSON to CSV converter that runs entirely in your browser. Handles quoted fields, custom delimiters, and headerless CSV.",
    },
  },
  {
    id: "image-metadata-remover",
    slug: "image-metadata-remover",
    name: "Image Metadata Remover",
    shortDescription:
      "Strip EXIF, GPS, and other hidden metadata from images entirely in your browser.",
    description: [
      "Choose a JPEG, PNG, WebP, BMP, or GIF image to remove EXIF data, GPS coordinates, camera details, embedded color profiles, and other non-visual metadata, then download the cleaned file.",
      "Metadata is removed by decoding the image and redrawing it onto an HTML canvas, then re-encoding the result — the same approach used by the Image Compressor and Image Format Converter — so nothing is silently renamed or copied; the image data itself is rebuilt from scratch with no metadata attached. Everything happens locally and the file is never uploaded.",
    ],
    categoryId: "images-media",
    tags: [
      "remove metadata",
      "exif remover",
      "strip exif",
      "image metadata",
      "privacy",
      "gps data removal",
    ],
    aliases: [
      "exif remover",
      "metadata stripper",
      "remove gps data from photo",
      "strip image metadata",
      "photo privacy cleaner",
    ],
    executionMode: "browser",
    featured: false,
    addedAt: "2026-07-21",
    relatedTools: [
      "image-exif-viewer",
      "image-compressor",
      "image-format-converter",
    ],
    usageNotes: [
      "Metadata is removed by redrawing the image on canvas and re-encoding it, not by editing bytes directly — this strips all embedded metadata, but means the output isn't a byte-identical copy of the original minus metadata.",
      "JPEG, PNG, and WebP are re-encoded back to their original format; BMP and GIF are saved as PNG instead, since browsers can't re-encode canvas output back to BMP or GIF and doing so is required to guarantee metadata removal. Animated GIF and WebP files are also flattened to a single frame in the process.",
      "Embedded color profiles (ICC profiles) are stripped along with everything else — the output is standard sRGB, which can cause a subtle color shift for images from wide-gamut cameras or editing software.",
      "Files over 25 MB are rejected to avoid freezing the tab on lower-powered devices.",
    ],
    seo: {
      description:
        "Free image metadata remover that strips EXIF, GPS, and other metadata from JPEG, PNG, WebP, BMP, and GIF images entirely in your browser — nothing is uploaded.",
    },
  },
  {
    id: "image-exif-viewer",
    slug: "image-exif-viewer",
    name: "Image EXIF Viewer",
    shortDescription:
      "Inspect camera, capture, and GPS metadata embedded in JPEG, PNG, and WebP images.",
    description: [
      "Choose a JPEG, PNG, or WebP image to see its embedded EXIF metadata: camera make and model, lens, exposure settings, capture date, orientation, color profile, and GPS location when present.",
      "Parsing happens entirely in your browser by reading the file's own bytes — the image is never uploaded, and nothing is shown that isn't actually present in the file.",
    ],
    categoryId: "images-media",
    tags: [
      "exif viewer",
      "image metadata",
      "photo metadata",
      "gps data",
      "camera info",
      "exif data",
    ],
    aliases: [
      "exif reader",
      "view image metadata",
      "photo info viewer",
      "check gps location photo",
      "metadata viewer",
    ],
    executionMode: "browser",
    featured: false,
    addedAt: "2026-07-21",
    relatedTools: [
      "image-metadata-remover",
      "image-compressor",
      "image-format-converter",
    ],
    usageNotes: [
      "Only JPEG, PNG, and WebP are supported — these are the formats that commonly carry EXIF data in a standard, parseable location.",
      "Fields are only shown when they're actually present in the file; nothing is inferred or guessed, and a clear message appears when no EXIF metadata is found at all.",
      "GPS coordinates, when present, are labeled as sensitive location data. The optional map link opens OpenStreetMap only when you click it — it's never loaded automatically, and the image itself is never sent anywhere.",
      "Use the Image Metadata Remover afterward if you want to strip this metadata before sharing the file.",
    ],
    seo: {
      description:
        "Free EXIF viewer that reads camera, capture, orientation, color profile, and GPS metadata from JPEG, PNG, and WebP images entirely in your browser.",
    },
  },
  {
    id: "image-watermark-studio",
    slug: "image-watermark-studio",
    name: "Image Watermark Studio",
    shortDescription:
      "Add text or logo watermarks, or remove watermarks and blemishes from your own images using a local AI model.",
    description: [
      "Add a text or logo watermark to an image with full control over position, size, opacity, rotation, color, font, shadow, and repetition (single, tiled, or diagonal), dragging it directly on the preview or dialing it in with sliders.",
      "Switch to Remove / Repair mode to brush, box-select, or erase a selection over a small area — like your own watermark, a timestamp, dust, or a scratch — then run AI removal, a real local inpainting model (LaMa) that reconstructs the area from its surroundings. A lightweight Quick repair (no model download) is available as a faster fallback, with a manual clone-stamp tool underneath that.",
      "Your image is never uploaded — decoding, editing, and re-encoding all happen on your device using the Canvas API, and downloads are always rendered at the original resolution even though the on-screen preview may be downscaled for large images. AI removal is the one exception to 'nothing leaves your device': the first time you use it, your browser downloads the public LaMa model file (about 200 MB) from Hugging Face and the ONNX Runtime Web engine from its CDN, both cached afterward so it only happens once. Only that public model file is transferred — never your image.",
    ],
    categoryId: "images-media",
    tags: [
      "watermark",
      "add watermark",
      "logo watermark",
      "remove watermark",
      "photo repair",
      "ai inpainting",
      "content-aware fill",
      "clone stamp",
      "lama",
    ],
    aliases: [
      "watermark maker",
      "watermark image",
      "image watermark tool",
      "photo blemish remover",
      "object removal tool",
      "ai watermark remover",
    ],
    executionMode: "browser",
    featured: true,
    addedAt: "2026-07-21",
    relatedTools: [
      "image-compressor",
      "image-format-converter",
      "image-metadata-remover",
    ],
    usageNotes: [
      "AI removal downloads a real local inpainting model (LaMa, Apache-2.0 licensed, ~200 MB) from Hugging Face the first time you use it, and prefers your GPU (WebGPU) with an automatic CPU (WebAssembly) fallback in browsers that don't support it — the model is cached afterward so it only downloads once.",
      "Large images are downscaled for the interactive preview only — downloads are always rendered from the original file at full resolution, including replaying AI removal at full resolution.",
      "Quick repair is a lightweight fallback that needs no model download and works instantly, but it's noticeably weaker on complex backgrounds, faces, or repeated watermarks — AI removal is recommended whenever your browser supports it.",
      "Only use Remove / Repair on images you own or have permission to edit — it isn't a way to strip ownership marks, watermarks, or credits from images that aren't yours, and results (from either method) are never guaranteed to be perfect or undetectable.",
      "JPEG output doesn't support transparency; a logo watermark's transparent areas or a PNG's alpha channel will be filled white when exporting to JPEG.",
    ],
    seo: {
      description:
        "Free browser-based tool to add text or logo watermarks, or remove watermarks and blemishes with a local AI inpainting model (LaMa) — your image is never uploaded.",
    },
  },
  {
    id: "image-crop-resize",
    slug: "image-crop-resize",
    name: "Image Crop & Resize",
    shortDescription:
      "Crop, rotate, flip, and resize JPEG, PNG, WebP, BMP, or GIF images with live preview.",
    description: [
      "Drag a free-form crop area or snap it to a preset ratio (square, 4:3, 3:2, 16:9, profile photo, Instagram post/story, Facebook cover, YouTube thumbnail, or your own custom dimensions), then rotate, flip, and resize by pixels or percentage with fit, fill, or exact output modes.",
      "Everything happens locally using the browser's Canvas API. Large images are shown at a downscaled working resolution for smooth dragging, but the exported file is always re-rendered from the original full-resolution image — nothing is uploaded, and cropping never upscales beyond the original resolution unless you turn that on explicitly.",
    ],
    categoryId: "images-media",
    tags: [
      "image cropper",
      "crop image",
      "resize image",
      "image editor",
      "aspect ratio",
      "rotate image",
      "flip image",
    ],
    aliases: [
      "photo cropper",
      "crop and resize",
      "image resizer",
      "picture cropper",
      "crop tool",
    ],
    executionMode: "browser",
    featured: true,
    addedAt: "2026-07-21",
    relatedTools: [
      "image-compressor",
      "image-format-converter",
      "image-metadata-remover",
    ],
    usageNotes: [
      "Undo and redo cover crop, rotate, and flip edits; export settings like format and quality use Reset to start over.",
      "Fit keeps the whole crop visible and may end up smaller than the size you typed; Fill crops further to exactly match it; Exact stretches to match it, which can distort the image.",
      "Animated GIF and WebP files are flattened to a single frame, and JPEG export fills transparent areas with white — both are called out with a warning before you export.",
      "Files over 25 MB are rejected to avoid freezing the tab on lower-powered devices.",
    ],
    seo: {
      description:
        "Free image cropper and resizer that runs entirely in your browser. Crop with aspect-ratio presets, rotate, flip, and resize JPEG, PNG, WebP, BMP, or GIF images with nothing uploaded.",
    },
  },
  {
    id: "pdf-merge-reorder",
    slug: "pdf-merge-reorder",
    name: "PDF Merge & Reorder",
    shortDescription:
      "Combine multiple PDFs into one, reordering, rotating, and removing pages along the way.",
    description: [
      "Add multiple PDF files, drag them into the order you want, then expand any file to reorder, rotate, or remove its individual pages before merging everything into a single downloadable PDF.",
      "Merging copies each page's original content directly using pdf-lib — an open-source PDF library — rather than rasterizing pages into images, so selectable text and vector graphics stay exactly as sharp as the source. Everything happens in your browser; files are never uploaded anywhere.",
    ],
    categoryId: "documents",
    tags: [
      "pdf merge",
      "combine pdf",
      "merge pdf files",
      "reorder pdf pages",
      "pdf page organizer",
      "rotate pdf pages",
    ],
    aliases: [
      "pdf combiner",
      "join pdf files",
      "pdf page reorder",
      "merge pdf online",
      "pdf organizer",
    ],
    executionMode: "browser",
    featured: true,
    addedAt: "2026-07-21",
    relatedTools: [],
    usageNotes: [
      "Password-protected or encrypted PDFs can't be processed here — remove the password in a trusted PDF reader first, then try again.",
      "Pages are copied directly from the original file (not re-rendered as images), so text stays selectable and quality is never lost, even after rotating.",
      "Files up to 100 MB each are supported, up to 30 files and 2,000 total pages — comfortably more than a browser tab can process without freezing.",
      "Undo and redo cover every reorder, rotation, and removal; Reset clears everything, including all loaded files, back to a blank start.",
    ],
    seo: {
      description:
        "Free PDF merge tool that runs entirely in your browser. Combine PDFs, drag to reorder files and pages, rotate or remove pages, with nothing ever uploaded.",
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

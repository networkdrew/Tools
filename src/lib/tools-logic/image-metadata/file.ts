/** Above this, canvas-based decoding/re-encoding can freeze the tab on lower-powered devices. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** Formats the browser can reliably decode via createImageBitmap for cleaning. */
export const SUPPORTED_INPUT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/bmp",
  "image/gif",
]);

export type OutputFormat = "image/png" | "image/jpeg" | "image/webp";

/** Formats canvas can re-encode back into directly; anything else falls back to PNG. */
const REENCODABLE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export type FileValidationResult =
  { ok: true } | { ok: false; message: string };

export function validateImageFile(file: File): FileValidationResult {
  if (!file.type.startsWith("image/")) {
    return {
      ok: false,
      message:
        "That file isn't an image. Choose a PNG, JPEG, WebP, BMP, or GIF file.",
    };
  }

  if (!SUPPORTED_INPUT_TYPES.has(file.type)) {
    const kind = file.type.replace("image/", "").toUpperCase() || "file";
    return {
      ok: false,
      message: `${kind} isn't supported here. Choose a PNG, JPEG, WebP, BMP, or GIF file instead.`,
    };
  }

  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      message: `That image is ${formatBytes(file.size)}, which is over the ${formatBytes(MAX_FILE_BYTES)} limit for in-browser processing.`,
    };
  }

  return { ok: true };
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(value < 10 ? 1 : 0)} ${units[unitIndex]}`;
}

/**
 * PNG, JPEG, and WebP are re-encoded back to themselves. BMP and GIF can't
 * be produced by canvas.toBlob in any mainstream browser, so they fall back
 * to PNG — the only way to guarantee the output is actually free of metadata
 * rather than a copy of the unsupported original.
 */
export function determineOutputFormat(inputType: string): OutputFormat {
  return REENCODABLE_TYPES.has(inputType)
    ? (inputType as OutputFormat)
    : "image/png";
}

/** Maps an image MIME type to a filename extension, defaulting unknown types to PNG. */
export function mimeToExtension(mime: string): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/webp":
      return "webp";
    default:
      return "png";
  }
}

export function outputFilename(originalName: string, mime: string): string {
  const base = originalName.replace(/\.[^./\\]+$/, "");
  return `${base || "image"}-cleaned.${mimeToExtension(mime)}`;
}

const FORMAT_LABELS: Record<string, string> = {
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "image/webp": "WebP",
  "image/bmp": "BMP",
  "image/gif": "GIF",
};

/** Human-readable label for a MIME type, falling back to the raw subtype for unrecognized ones. */
export function formatLabel(mime: string): string {
  return FORMAT_LABELS[mime] ?? mime.replace("image/", "").toUpperCase();
}

export interface SizeComparison {
  deltaBytes: number;
  deltaPercent: number;
  direction: "smaller" | "larger" | "same";
}

/** Compares original and cleaned file sizes. Re-encoding can shrink or grow a file, so both directions are reported honestly. */
export function compareSizes(
  originalBytes: number,
  cleanedBytes: number,
): SizeComparison {
  const deltaBytes = cleanedBytes - originalBytes;
  if (originalBytes <= 0 || deltaBytes === 0) {
    return { deltaBytes, deltaPercent: 0, direction: "same" };
  }
  const deltaPercent = Math.round((Math.abs(deltaBytes) / originalBytes) * 100);
  return {
    deltaBytes,
    deltaPercent,
    direction: deltaBytes < 0 ? "smaller" : "larger",
  };
}

/** Above this, canvas-based decoding/re-encoding can freeze the tab on lower-powered devices. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** Formats the browser can reliably decode via createImageBitmap for cropping. */
export const SUPPORTED_INPUT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/bmp",
  "image/gif",
]);

export type OutputFormat = "image/png" | "image/jpeg" | "image/webp";

export type FileValidationResult =
  { ok: true } | { ok: false; message: string };

export function validateImageFile(file: File): FileValidationResult {
  if (!file.type.startsWith("image/")) {
    return {
      ok: false,
      message:
        "That file isn't an image. Choose a JPEG, PNG, WebP, BMP, or GIF file.",
    };
  }

  if (!SUPPORTED_INPUT_TYPES.has(file.type)) {
    const kind = file.type.replace("image/", "").toUpperCase() || "file";
    return {
      ok: false,
      message: `${kind} isn't supported here. Choose a JPEG, PNG, WebP, BMP, or GIF file instead.`,
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
  return `${base || "image"}-cropped.${mimeToExtension(mime)}`;
}

const FORMAT_LABELS: Record<string, string> = {
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "image/webp": "WebP",
  "image/bmp": "BMP",
  "image/gif": "GIF",
};

export function formatLabel(mime: string): string {
  return FORMAT_LABELS[mime] ?? mime.replace("image/", "").toUpperCase();
}

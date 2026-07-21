/** Above this, canvas-based re-encoding can freeze the tab on lower-powered devices. */
export const MAX_FILE_BYTES = 25 * 1024 * 1024;

export type FileValidationResult =
  { ok: true } | { ok: false; message: string };

/** Formats that decode to a single raster frame canvas can re-encode faithfully. */
const UNSUPPORTED_TYPES = new Set(["image/svg+xml", "image/gif"]);

export function validateImageFile(file: File): FileValidationResult {
  if (!file.type.startsWith("image/")) {
    return {
      ok: false,
      message:
        "That file isn't an image. Choose a JPEG, PNG, WebP, or similar image file.",
    };
  }

  if (UNSUPPORTED_TYPES.has(file.type)) {
    return {
      ok: false,
      message:
        "SVG and animated GIF files can't be compressed here — canvas re-encoding would flatten vectors or animation into a single raster frame. Try a JPEG, PNG, or WebP.",
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

/** Percentage reduction from original to compressed size, clamped to 0 (never shown as negative). */
export function computeSavingsPercent(
  originalBytes: number,
  compressedBytes: number,
): number {
  if (originalBytes <= 0) return 0;
  return Math.max(0, Math.round((1 - compressedBytes / originalBytes) * 100));
}

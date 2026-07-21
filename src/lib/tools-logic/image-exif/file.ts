import {
  formatBytes,
  MAX_FILE_BYTES,
} from "@/lib/tools-logic/image-metadata/file";

export { formatBytes, MAX_FILE_BYTES };

/** Formats this tool can reliably parse EXIF/TIFF metadata from. */
const SUPPORTED_INPUT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export type FileValidationResult =
  { ok: true } | { ok: false; message: string };

export function validateImageFile(file: File): FileValidationResult {
  if (!file.type.startsWith("image/")) {
    return {
      ok: false,
      message: "That file isn't an image. Choose a JPEG, PNG, or WebP file.",
    };
  }

  if (!SUPPORTED_INPUT_TYPES.has(file.type)) {
    const kind = file.type.replace("image/", "").toUpperCase() || "file";
    return {
      ok: false,
      message: `${kind} isn't supported here. Choose a JPEG, PNG, or WebP file instead.`,
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

const FORMAT_LABELS: Record<string, string> = {
  "image/png": "PNG",
  "image/jpeg": "JPEG",
  "image/webp": "WebP",
};

export function formatLabel(mime: string): string {
  return FORMAT_LABELS[mime] ?? mime.replace("image/", "").toUpperCase();
}

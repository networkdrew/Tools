/** Above this, parsing/rendering previews can freeze the tab on lower-powered devices. */
export const MAX_FILE_BYTES = 100 * 1024 * 1024;

/**
 * Lower than pdf-merge's page cap: this tool renders a thumbnail per page
 * and can produce many output files at once, both of which cost more per
 * page than pdf-merge's plain page-copy.
 */
export const MAX_PAGES = 500;

export type FileValidationResult =
  { ok: true } | { ok: false; message: string };

export function validatePdfFile(file: File): FileValidationResult {
  const looksLikePdf =
    file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!looksLikePdf) {
    return { ok: false, message: `"${file.name}" isn't a PDF file.` };
  }

  if (file.size === 0) {
    return { ok: false, message: `"${file.name}" is empty.` };
  }

  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      message: `"${file.name}" is ${formatBytes(file.size)}, which is over the ${formatBytes(MAX_FILE_BYTES)} limit for in-browser processing.`,
    };
  }

  return { ok: true };
}

export function checkPageLimit(pageCount: number): FileValidationResult {
  if (pageCount > MAX_PAGES) {
    return {
      ok: false,
      message: `This PDF has ${pageCount} pages, which is over the ${MAX_PAGES}-page limit for in-browser processing.`,
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

/** Ensures a safe, non-empty base name to build output filenames from. */
export function sanitizeBaseName(name: string): string {
  const trimmed = name.trim().replace(/[\\/:*?"<>|]+/g, "_");
  const withoutExt = trimmed.replace(/\.pdf$/i, "").trim();
  return withoutExt || "document";
}

/** A single-output filename: `<base>.pdf`. */
export function singleOutputFilename(base: string): string {
  return `${sanitizeBaseName(base)}.pdf`;
}

/** A multi-output filename: `<base>-<n>.pdf`, zero-padded to the group size. */
export function numberedOutputFilename(
  base: string,
  index: number,
  total: number,
): string {
  const width = String(total).length;
  const n = String(index).padStart(width, "0");
  return `${sanitizeBaseName(base)}-${n}.pdf`;
}

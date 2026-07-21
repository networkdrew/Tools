/** Above this, parsing/merging can freeze the tab on lower-powered devices. */
export const MAX_FILE_BYTES = 100 * 1024 * 1024;

/** Caps kept low enough to protect browser memory during merge. */
export const MAX_FILES = 30;
export const MAX_TOTAL_PAGES = 2000;

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

export function checkFileCountLimit(
  currentCount: number,
  additionalCount: number,
): FileValidationResult {
  if (currentCount + additionalCount > MAX_FILES) {
    return {
      ok: false,
      message: `Adding these files would bring the total to more than ${MAX_FILES} PDFs, which is the limit for in-browser processing.`,
    };
  }
  return { ok: true };
}

export function checkTotalPageLimit(
  currentTotal: number,
  additionalPages: number,
): FileValidationResult {
  if (currentTotal + additionalPages > MAX_TOTAL_PAGES) {
    return {
      ok: false,
      message: `Adding this file would bring the total to more than ${MAX_TOTAL_PAGES} pages, which is the limit for in-browser processing.`,
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

/** Ensures a safe, non-empty ".pdf" filename for the merged download. */
export function sanitizeOutputFilename(name: string): string {
  const trimmed = name.trim().replace(/[\\/:*?"<>|]+/g, "_");
  const withoutExt = trimmed.replace(/\.pdf$/i, "").trim();
  return `${withoutExt || "merged"}.pdf`;
}

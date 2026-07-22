/**
 * Page-range parsing and grouping. Page numbers throughout this module are
 * 1-based (as shown to users), converted to pdf-lib's 0-based indices only
 * at the point of extraction (see extract.ts).
 */

export type ParseRangeResult =
  { ok: true; value: number[] } | { ok: false; message: string };

/**
 * Parses a comma-separated list of page numbers and ranges (e.g.
 * "1-3, 6, 9-12") into a deduplicated, ascending array of 1-based page
 * numbers. Duplicate or out-of-range page numbers are rejected outright
 * rather than silently collapsed, so typos surface immediately.
 */
export function parsePageRanges(
  input: string,
  pageCount: number,
): ParseRangeResult {
  const tokens = input
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (tokens.length === 0) {
    return {
      ok: false,
      message: "Enter at least one page number or range, e.g. 1-3, 6, 9-12.",
    };
  }

  const seen = new Set<number>();

  for (const token of tokens) {
    const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(token);
    const singleMatch = /^(\d+)$/.exec(token);

    let start: number;
    let end: number;

    if (rangeMatch) {
      start = Number(rangeMatch[1]);
      end = Number(rangeMatch[2]);
      if (start > end) {
        return {
          ok: false,
          message: `"${token}" isn't a valid range — the start page must come before the end page.`,
        };
      }
    } else if (singleMatch) {
      start = end = Number(singleMatch[1]);
    } else {
      return {
        ok: false,
        message: `"${token}" isn't a valid page number or range. Use formats like "1-3" or "6".`,
      };
    }

    if (start < 1 || end > pageCount) {
      return {
        ok: false,
        message: `"${token}" is out of range — this document only has ${pageCount} page${pageCount === 1 ? "" : "s"}.`,
      };
    }

    for (let page = start; page <= end; page++) {
      if (seen.has(page)) {
        return {
          ok: false,
          message: `Page ${page} is selected more than once. Remove the duplicate and try again.`,
        };
      }
      seen.add(page);
    }
  }

  return { ok: true, value: [...seen].sort((a, b) => a - b) };
}

export type ParseRangeGroupsResult =
  { ok: true; value: number[][] } | { ok: false; message: string };

/**
 * Parses one range group per line (each line becomes one output PDF) using
 * `parsePageRanges` for each line. Duplicate pages are only rejected within
 * a single line — the same page is allowed to appear in more than one
 * output file.
 */
export function parseRangeGroups(
  input: string,
  pageCount: number,
): ParseRangeGroupsResult {
  const lines = input
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return {
      ok: false,
      message: "Enter at least one range on its own line, e.g.\n1-3\n4-6\n7-10",
    };
  }

  const groups: number[][] = [];
  for (const [i, line] of lines.entries()) {
    const parsed = parsePageRanges(line, pageCount);
    if (!parsed.ok) {
      return { ok: false, message: `Line ${i + 1}: ${parsed.message}` };
    }
    groups.push(parsed.value);
  }

  return { ok: true, value: groups };
}

/** Splits `1..pageCount` into consecutive chunks of `chunkSize` pages each. */
export function chunkPages(pageCount: number, chunkSize: number): number[][] {
  if (chunkSize < 1) return [];
  const chunks: number[][] = [];
  for (let start = 1; start <= pageCount; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, pageCount);
    const chunk: number[] = [];
    for (let page = start; page <= end; page++) chunk.push(page);
    chunks.push(chunk);
  }
  return chunks;
}

/** Every page as its own single-page group, in document order. */
export function everyPageSeparately(pageCount: number): number[][] {
  return Array.from({ length: pageCount }, (_, i) => [i + 1]);
}

/** All pages *not* in `selected`, in ascending document order. */
export function complementPages(
  pageCount: number,
  selected: ReadonlySet<number>,
): number[] {
  const result: number[] = [];
  for (let page = 1; page <= pageCount; page++) {
    if (!selected.has(page)) result.push(page);
  }
  return result;
}

export function normalizeRotation(degreesValue: number): number {
  return ((degreesValue % 360) + 360) % 360;
}

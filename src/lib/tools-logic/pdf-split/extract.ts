import { PDFDocument, degrees } from "pdf-lib";
import { normalizeRotation } from "./ranges";

export interface BuildProgress {
  completed: number;
  total: number;
}

export interface BuildOptions {
  onProgress?: (progress: BuildProgress) => void;
  /** Checked cooperatively so long-running builds can be cancelled. */
  shouldCancel?: () => boolean;
}

export type BuildPdfResult =
  | { ok: true; value: Uint8Array }
  | { ok: false; message: string; cancelled?: boolean };

/**
 * Builds a single new PDF containing `pageNumbers` (1-based) copied from
 * `source`, in the given order, with any extra rotation applied on top of
 * each page's original rotation. Pages are copied directly (pdf-lib's
 * `copyPages`) rather than rasterized, so text, vectors, and quality are
 * preserved exactly.
 */
export async function buildPdf(
  source: PDFDocument,
  pageNumbers: number[],
  rotations: ReadonlyMap<number, number>,
): Promise<BuildPdfResult> {
  if (pageNumbers.length === 0) {
    return { ok: false, message: "Select at least one page." };
  }

  const output = await PDFDocument.create();
  const indices = pageNumbers.map((n) => n - 1);
  const copiedPages = await output.copyPages(source, indices);

  for (const [i, pageNumber] of pageNumbers.entries()) {
    const copiedPage = copiedPages[i];
    if (!copiedPage) {
      return {
        ok: false,
        message: "A page couldn't be copied. Please try again.",
      };
    }
    const extraRotation = rotations.get(pageNumber) ?? 0;
    if (extraRotation !== 0) {
      const original = copiedPage.getRotation().angle;
      copiedPage.setRotation(
        degrees(normalizeRotation(original + extraRotation)),
      );
    }
    output.addPage(copiedPage);
  }

  const bytes = await output.save();
  return { ok: true, value: bytes };
}

export interface NamedPdf {
  name: string;
  bytes: Uint8Array;
}

export type BuildManyResult =
  | { ok: true; value: NamedPdf[] }
  | { ok: false; message: string; cancelled?: boolean };

/**
 * Builds one PDF per group in `groups` (e.g. one per split file), reusing
 * `buildPdf` for each and reporting progress across the whole batch.
 */
export async function buildManyPdfs(
  source: PDFDocument,
  groups: number[][],
  rotations: ReadonlyMap<number, number>,
  nameForGroup: (index: number, total: number) => string,
  options: BuildOptions = {},
): Promise<BuildManyResult> {
  if (groups.length === 0) {
    return { ok: false, message: "There's nothing to split." };
  }

  const results: NamedPdf[] = [];
  const total = groups.length;

  for (let i = 0; i < total; i++) {
    if (options.shouldCancel?.()) {
      return { ok: false, message: "Split cancelled.", cancelled: true };
    }

    const group = groups[i] as number[];
    const built = await buildPdf(source, group, rotations);
    if (!built.ok) return built;

    results.push({ name: nameForGroup(i + 1, total), bytes: built.value });
    options.onProgress?.({ completed: i + 1, total });
  }

  return { ok: true, value: results };
}

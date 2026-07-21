import { PDFDocument, degrees } from "pdf-lib";
import { normalizeRotation, type FlattenedPage } from "./pages";

export interface MergeProgress {
  completed: number;
  total: number;
}

export type MergeResult =
  | { ok: true; value: Uint8Array }
  | { ok: false; message: string; cancelled?: boolean };

export interface MergeOptions {
  onProgress?: (progress: MergeProgress) => void;
  /** Checked between pages so long merges can be cancelled cooperatively. */
  shouldCancel?: () => boolean;
}

/**
 * Builds the final merged PDF by copying each requested page's content
 * stream directly (pdf-lib's `copyPages`) — never rasterizing, so vector
 * content, text, and quality are preserved exactly.
 */
export async function mergePdfs(
  entries: FlattenedPage[],
  sourceDocs: Map<string, PDFDocument>,
  options: MergeOptions = {},
): Promise<MergeResult> {
  if (entries.length === 0) {
    return { ok: false, message: "Add at least one page to merge." };
  }

  const output = await PDFDocument.create();
  const total = entries.length;

  for (let i = 0; i < total; i++) {
    if (options.shouldCancel?.()) {
      return { ok: false, message: "Merge cancelled.", cancelled: true };
    }

    const entry = entries[i] as FlattenedPage;
    const sourceDoc = sourceDocs.get(entry.groupId);
    if (!sourceDoc) {
      return {
        ok: false,
        message:
          "A source document went missing during the merge. Please try again.",
      };
    }

    const [copiedPage] = await output.copyPages(sourceDoc, [
      entry.page.sourcePageIndex,
    ]);
    if (!copiedPage) {
      return {
        ok: false,
        message:
          "A page couldn't be copied during the merge. Please try again.",
      };
    }
    const originalRotation = copiedPage.getRotation().angle;
    copiedPage.setRotation(
      degrees(normalizeRotation(originalRotation + entry.page.rotation)),
    );
    output.addPage(copiedPage);

    options.onProgress?.({ completed: i + 1, total });
  }

  const bytes = await output.save();
  return { ok: true, value: bytes };
}

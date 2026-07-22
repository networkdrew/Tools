import * as pdfjsLib from "pdfjs-dist";
import type { PDFDocumentProxy } from "pdfjs-dist";
// Vite bundles the worker file itself and gives us its final URL, so the
// worker loads from this build's own assets rather than a CDN — nothing
// about rendering a preview thumbnail leaves the browser.
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

/**
 * Parses the same PDF bytes with pdf.js purely to rasterize preview
 * thumbnails. This is independent of pdf-lib, which builds the actual
 * downloaded output by copying page content directly — rendering a
 * thumbnail here never touches (or degrades) the exported PDF.
 */
export async function loadPdfJsDocument(
  bytes: Uint8Array,
): Promise<PDFDocumentProxy> {
  // pdf.js's worker can transfer/detach a typed array's buffer, so it gets
  // its own copy rather than sharing the bytes pdf-lib is also holding.
  const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
  return loadingTask.promise;
}

/** Renders one page (1-based) to a PNG data URL scaled to `maxWidth`. */
export async function renderPageThumbnail(
  pdfDoc: PDFDocumentProxy,
  pageNumber: number,
  maxWidth = 160,
): Promise<string> {
  const page = await pdfDoc.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = maxWidth / baseViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(viewport.width));
  canvas.height = Math.max(1, Math.round(viewport.height));
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas rendering isn't supported in this browser.");
  }

  await page.render({ canvas, canvasContext: context, viewport }).promise;
  return canvas.toDataURL("image/png");
}

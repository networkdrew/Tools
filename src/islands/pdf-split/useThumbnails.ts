import { useCallback, useEffect, useRef, useState } from "react";

export interface ThumbnailState {
  urls: Map<number, string>;
  rendered: number;
  total: number;
  isRendering: boolean;
  error: string | null;
}

const EMPTY_STATE: ThumbnailState = {
  urls: new Map(),
  rendered: 0,
  total: 0,
  isRendering: false,
  error: null,
};

/**
 * Renders page-preview thumbnails in the background via pdf.js. Loaded
 * dynamically so pdf.js's worker only ever gets fetched once a PDF is
 * actually being processed. Thumbnails are a display-only convenience —
 * page selection (the checkbox on each card) works immediately, before or
 * even if this never finishes, so a slow or failed render never blocks use
 * of the tool.
 */
export function useThumbnails() {
  const [state, setState] = useState<ThumbnailState>(EMPTY_STATE);
  const cancelRef = useRef(false);

  const start = useCallback(async (bytes: Uint8Array, pageCount: number) => {
    cancelRef.current = false;
    setState({ ...EMPTY_STATE, total: pageCount, isRendering: true });

    try {
      const { loadPdfJsDocument, renderPageThumbnail } =
        await import("./thumbnails");
      const pdfDoc = await loadPdfJsDocument(bytes);
      const urls = new Map<number, string>();

      for (let page = 1; page <= pageCount; page++) {
        if (cancelRef.current) return;
        const url = await renderPageThumbnail(pdfDoc, page);
        if (cancelRef.current) return;
        urls.set(page, url);
        setState((s) => ({ ...s, urls: new Map(urls), rendered: page }));
      }

      if (!cancelRef.current) {
        setState((s) => ({ ...s, isRendering: false }));
      }
    } catch {
      if (!cancelRef.current) {
        setState((s) => ({
          ...s,
          isRendering: false,
          error:
            "Page previews couldn't be generated, but every page below is still fully selectable by number.",
        }));
      }
    }
  }, []);

  const reset = useCallback(() => {
    cancelRef.current = true;
    setState(EMPTY_STATE);
  }, []);

  useEffect(
    () => () => {
      cancelRef.current = true;
    },
    [],
  );

  return { state, start, reset };
}

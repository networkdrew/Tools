import { PDFDocument } from "pdf-lib";

export type LoadPdfResult =
  | { ok: true; value: { doc: PDFDocument; pageCount: number } }
  | { ok: false; message: string; reason: "encrypted" | "invalid" };

const PDF_MAGIC = "%PDF-";

/**
 * Loads a PDF with pdf-lib and classifies failures so the UI can explain
 * *why* a file didn't work instead of showing a raw parser error.
 */
export async function loadPdfDocument(
  bytes: Uint8Array,
): Promise<LoadPdfResult> {
  const header = bytesToAscii(bytes.subarray(0, 5));
  if (header !== PDF_MAGIC) {
    return {
      ok: false,
      reason: "invalid",
      message:
        "That file doesn't look like a PDF — it's missing the standard PDF header.",
    };
  }

  try {
    const doc = await PDFDocument.load(bytes, {
      ignoreEncryption: false,
      throwOnInvalidObject: false,
      updateMetadata: false,
    });
    return { ok: true, value: { doc, pageCount: doc.getPageCount() } };
  } catch (error) {
    // pdf-lib can end up loaded as two separate module instances under
    // Vite/Vitest's CJS/ESM interop, which breaks `instanceof
    // EncryptedPDFError` — matching on the (stable, library-owned) message
    // text is what actually works across both.
    if (error instanceof Error && /is encrypted/i.test(error.message)) {
      return {
        ok: false,
        reason: "encrypted",
        message:
          "This PDF is password-protected or encrypted. Password-protected PDFs can't be processed here — remove the password in a PDF reader you trust first, then try again.",
      };
    }
    return {
      ok: false,
      reason: "invalid",
      message:
        "This PDF couldn't be read. It may be corrupted or use a PDF feature this tool doesn't support.",
    };
  }
}

function bytesToAscii(bytes: Uint8Array): string {
  let out = "";
  for (const byte of bytes) out += String.fromCharCode(byte);
  return out;
}

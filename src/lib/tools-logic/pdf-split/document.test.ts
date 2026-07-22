import { describe, expect, it, vi } from "vitest";
import { EncryptedPDFError, PDFDocument } from "pdf-lib";
import { loadPdfDocument } from "./document";

async function makeSamplePdfBytes(pageSizes: [number, number][]) {
  const doc = await PDFDocument.create();
  for (const [w, h] of pageSizes) doc.addPage([w, h]);
  return doc.save();
}

describe("loadPdfDocument", () => {
  it("loads a valid PDF and reports its page count", async () => {
    const bytes = await makeSamplePdfBytes([
      [100, 100],
      [200, 200],
      [300, 300],
    ]);
    const result = await loadPdfDocument(bytes);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.pageCount).toBe(3);
    }
  });

  it("rejects bytes without a PDF header", async () => {
    const bytes = new TextEncoder().encode("not a pdf at all");
    const result = await loadPdfDocument(bytes);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
  });

  it("rejects bytes with a PDF header but corrupted contents", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.7\ngarbage garbage garbage");
    const result = await loadPdfDocument(bytes);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
  });

  it("classifies an encrypted PDF distinctly from a corrupted one", async () => {
    const bytes = await makeSamplePdfBytes([[100, 100]]);
    const spy = vi
      .spyOn(PDFDocument, "load")
      .mockRejectedValueOnce(new EncryptedPDFError());

    const result = await loadPdfDocument(bytes);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("encrypted");
      expect(result.message).toMatch(/password/i);
    }

    spy.mockRestore();
  });
});

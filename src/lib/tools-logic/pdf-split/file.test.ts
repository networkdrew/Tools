import { describe, expect, it } from "vitest";
import {
  MAX_FILE_BYTES,
  MAX_PAGES,
  checkPageLimit,
  formatBytes,
  numberedOutputFilename,
  sanitizeBaseName,
  singleOutputFilename,
  validatePdfFile,
} from "./file";

function fakeFile(name: string, type: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("validatePdfFile", () => {
  it("accepts a normal PDF file", () => {
    const result = validatePdfFile(
      fakeFile("doc.pdf", "application/pdf", 1024),
    );
    expect(result.ok).toBe(true);
  });

  it("accepts a .pdf-named file with a missing/wrong MIME type", () => {
    const result = validatePdfFile(fakeFile("doc.pdf", "", 1024));
    expect(result.ok).toBe(true);
  });

  it("rejects a non-PDF file", () => {
    const result = validatePdfFile(fakeFile("photo.png", "image/png", 1024));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("isn't a PDF");
  });

  it("rejects an empty file", () => {
    const result = validatePdfFile(fakeFile("doc.pdf", "application/pdf", 0));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("empty");
  });

  it("rejects a file over the size limit", () => {
    const result = validatePdfFile(
      fakeFile("doc.pdf", "application/pdf", MAX_FILE_BYTES + 1),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toContain("limit");
  });
});

describe("checkPageLimit", () => {
  it("allows page counts at or under the max", () => {
    expect(checkPageLimit(MAX_PAGES).ok).toBe(true);
  });

  it("rejects page counts over the max", () => {
    const result = checkPageLimit(MAX_PAGES + 1);
    expect(result.ok).toBe(false);
  });
});

describe("formatBytes", () => {
  it("formats bytes, KB, MB", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("sanitizeBaseName", () => {
  it("strips an existing .pdf extension and unsafe characters", () => {
    expect(sanitizeBaseName("report.pdf")).toBe("report");
    expect(sanitizeBaseName('a/b:c*d?e"f<g>h|i')).toBe("a_b_c_d_e_f_g_h_i");
  });

  it("falls back to 'document' when the name is empty", () => {
    expect(sanitizeBaseName("   ")).toBe("document");
  });
});

describe("singleOutputFilename", () => {
  it("appends .pdf", () => {
    expect(singleOutputFilename("extracted")).toBe("extracted.pdf");
  });
});

describe("numberedOutputFilename", () => {
  it("zero-pads the index to the width of the total", () => {
    expect(numberedOutputFilename("page", 1, 12)).toBe("page-01.pdf");
    expect(numberedOutputFilename("page", 12, 12)).toBe("page-12.pdf");
  });

  it("doesn't pad when the total is single-digit", () => {
    expect(numberedOutputFilename("page", 3, 5)).toBe("page-3.pdf");
  });
});

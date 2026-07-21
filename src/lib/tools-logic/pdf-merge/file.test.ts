import { describe, expect, it } from "vitest";
import {
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_TOTAL_PAGES,
  checkFileCountLimit,
  checkTotalPageLimit,
  formatBytes,
  sanitizeOutputFilename,
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

describe("checkFileCountLimit", () => {
  it("allows counts at or under the max", () => {
    expect(checkFileCountLimit(MAX_FILES - 1, 1).ok).toBe(true);
  });

  it("rejects counts over the max", () => {
    const result = checkFileCountLimit(MAX_FILES, 1);
    expect(result.ok).toBe(false);
  });
});

describe("checkTotalPageLimit", () => {
  it("allows totals at or under the max", () => {
    expect(checkTotalPageLimit(MAX_TOTAL_PAGES - 10, 10).ok).toBe(true);
  });

  it("rejects totals over the max", () => {
    const result = checkTotalPageLimit(MAX_TOTAL_PAGES - 5, 10);
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

describe("sanitizeOutputFilename", () => {
  it("appends .pdf when missing", () => {
    expect(sanitizeOutputFilename("report")).toBe("report.pdf");
  });

  it("doesn't duplicate an existing .pdf extension", () => {
    expect(sanitizeOutputFilename("report.pdf")).toBe("report.pdf");
    expect(sanitizeOutputFilename("REPORT.PDF")).toBe("REPORT.pdf");
  });

  it("strips unsafe filesystem characters", () => {
    expect(sanitizeOutputFilename('a/b:c*d?e"f<g>h|i')).toBe(
      "a_b_c_d_e_f_g_h_i.pdf",
    );
  });

  it("falls back to 'merged' when the name is empty", () => {
    expect(sanitizeOutputFilename("   ")).toBe("merged.pdf");
  });
});

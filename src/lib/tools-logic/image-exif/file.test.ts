import { describe, expect, it } from "vitest";
import { formatLabel, MAX_FILE_BYTES, validateImageFile } from "./file";

function fakeFile(type: string, size: number): File {
  const file = new File([new Uint8Array(1)], "test", { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("validateImageFile", () => {
  it("accepts JPEG, PNG, and WebP under the size limit", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validateImageFile(fakeFile(type, 1024))).toEqual({ ok: true });
    }
  });

  it("rejects a non-image file", () => {
    const result = validateImageFile(fakeFile("text/plain", 1024));
    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.message).toMatch(/isn't an image/);
  });

  it("rejects formats this tool can't parse EXIF from, like BMP and GIF", () => {
    for (const type of ["image/bmp", "image/gif"]) {
      const result = validateImageFile(fakeFile(type, 1024));
      expect(result.ok).toBe(false);
      expect(result.ok ? "" : result.message).toMatch(/JPEG, PNG, or WebP/);
    }
  });

  it("rejects a file over the size limit", () => {
    const result = validateImageFile(fakeFile("image/png", MAX_FILE_BYTES + 1));
    expect(result.ok).toBe(false);
  });

  it("accepts a file exactly at the size limit", () => {
    expect(validateImageFile(fakeFile("image/jpeg", MAX_FILE_BYTES)).ok).toBe(
      true,
    );
  });
});

describe("formatLabel", () => {
  it("labels known formats", () => {
    expect(formatLabel("image/jpeg")).toBe("JPEG");
    expect(formatLabel("image/png")).toBe("PNG");
    expect(formatLabel("image/webp")).toBe("WebP");
  });

  it("falls back to the subtype for unknown formats", () => {
    expect(formatLabel("image/avif")).toBe("AVIF");
  });
});

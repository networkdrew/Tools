import { describe, expect, it } from "vitest";
import {
  computeWorkingSize,
  formatBytes,
  MAX_FILE_BYTES,
  mimeToExtension,
  outputFilename,
  validateImageFile,
} from "./file";

function fakeFile(name: string, type: string, size: number): File {
  return new File([new Uint8Array(size)], name, { type });
}

describe("validateImageFile", () => {
  it("accepts a supported image type under the size limit", () => {
    expect(validateImageFile(fakeFile("a.png", "image/png", 1024))).toEqual({
      ok: true,
    });
  });

  it("rejects a non-image file", () => {
    const result = validateImageFile(fakeFile("a.txt", "text/plain", 10));
    expect(result.ok).toBe(false);
  });

  it("rejects an unsupported image type", () => {
    const result = validateImageFile(fakeFile("a.tiff", "image/tiff", 10));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/isn't supported/);
  });

  it("rejects files over the size limit", () => {
    const result = validateImageFile(
      fakeFile("big.png", "image/png", MAX_FILE_BYTES + 1),
    );
    expect(result.ok).toBe(false);
  });
});

describe("formatBytes", () => {
  it("formats bytes, KB, and MB", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2048)).toBe("2.0 KB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("handles invalid input gracefully", () => {
    expect(formatBytes(-1)).toBe("0 B");
    expect(formatBytes(NaN)).toBe("0 B");
  });
});

describe("computeWorkingSize", () => {
  it("leaves small images untouched", () => {
    expect(computeWorkingSize(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("downscales large images while preserving aspect ratio", () => {
    const result = computeWorkingSize(3200, 1600);
    expect(result.width).toBe(1600);
    expect(result.height).toBe(800);
  });

  it("never enlarges", () => {
    const result = computeWorkingSize(100, 50);
    expect(result).toEqual({ width: 100, height: 50 });
  });
});

describe("outputFilename / mimeToExtension", () => {
  it("builds a suffixed filename with the right extension", () => {
    expect(outputFilename("photo.jpg", "png", "watermarked")).toBe(
      "photo-watermarked.png",
    );
  });

  it("falls back to 'image' for a nameless file", () => {
    expect(outputFilename("", "jpg", "repaired")).toBe("image-repaired.jpg");
  });

  it("maps known mime types to extensions", () => {
    expect(mimeToExtension("image/jpeg")).toBe("jpg");
    expect(mimeToExtension("image/webp")).toBe("webp");
    expect(mimeToExtension("image/png")).toBe("png");
    expect(mimeToExtension("image/bmp")).toBe("png");
  });
});

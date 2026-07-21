import { describe, expect, it } from "vitest";
import {
  computeSavingsPercent,
  formatBytes,
  MAX_FILE_BYTES,
  validateImageFile,
} from "./file";

function fakeFile(type: string, size: number): File {
  const file = new File([new Uint8Array(1)], "test", { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("validateImageFile", () => {
  it("accepts a normal JPEG under the size limit", () => {
    expect(validateImageFile(fakeFile("image/jpeg", 1024))).toEqual({
      ok: true,
    });
  });

  it("accepts PNG and WebP", () => {
    expect(validateImageFile(fakeFile("image/png", 1024)).ok).toBe(true);
    expect(validateImageFile(fakeFile("image/webp", 1024)).ok).toBe(true);
  });

  it("rejects a non-image file", () => {
    const result = validateImageFile(fakeFile("text/plain", 1024));
    expect(result.ok).toBe(false);
  });

  it("rejects SVG (vector, would be flattened)", () => {
    const result = validateImageFile(fakeFile("image/svg+xml", 1024));
    expect(result.ok).toBe(false);
  });

  it("rejects animated GIF (would flatten to one frame)", () => {
    const result = validateImageFile(fakeFile("image/gif", 1024));
    expect(result.ok).toBe(false);
  });

  it("rejects a file over the size limit", () => {
    const result = validateImageFile(
      fakeFile("image/jpeg", MAX_FILE_BYTES + 1),
    );
    expect(result.ok).toBe(false);
  });

  it("accepts a file exactly at the size limit", () => {
    expect(validateImageFile(fakeFile("image/jpeg", MAX_FILE_BYTES)).ok).toBe(
      true,
    );
  });
});

describe("formatBytes", () => {
  it("formats bytes under 1KB as whole bytes", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats kilobytes with one decimal under 10", () => {
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });

  it("handles zero and negative input safely", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(-5)).toBe("0 B");
  });
});

describe("computeSavingsPercent", () => {
  it("computes a positive percentage reduction", () => {
    expect(computeSavingsPercent(1000, 400)).toBe(60);
  });

  it("clamps to 0 when the result got larger", () => {
    expect(computeSavingsPercent(1000, 1200)).toBe(0);
  });

  it("returns 0 for a zero original size", () => {
    expect(computeSavingsPercent(0, 100)).toBe(0);
  });
});

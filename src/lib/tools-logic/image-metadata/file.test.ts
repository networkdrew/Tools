import { describe, expect, it } from "vitest";
import {
  compareSizes,
  determineOutputFormat,
  formatBytes,
  formatLabel,
  MAX_FILE_BYTES,
  mimeToExtension,
  outputFilename,
  validateImageFile,
} from "./file";

function fakeFile(type: string, size: number): File {
  const file = new File([new Uint8Array(1)], "test", { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
}

describe("validateImageFile", () => {
  it("accepts PNG, JPEG, WebP, BMP, and GIF under the size limit", () => {
    for (const type of [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/bmp",
      "image/gif",
    ]) {
      expect(validateImageFile(fakeFile(type, 1024))).toEqual({ ok: true });
    }
  });

  it("rejects a non-image file", () => {
    const result = validateImageFile(fakeFile("text/plain", 1024));
    expect(result.ok).toBe(false);
  });

  it("rejects an unsupported image type with a useful message", () => {
    const result = validateImageFile(fakeFile("image/svg+xml", 1024));
    expect(result.ok).toBe(false);
    expect(result.ok ? "" : result.message).toMatch(/PNG, JPEG, WebP, BMP/);
  });

  it("rejects a file over the size limit", () => {
    const result = validateImageFile(fakeFile("image/png", MAX_FILE_BYTES + 1));
    expect(result.ok).toBe(false);
  });

  it("accepts a file exactly at the size limit", () => {
    expect(validateImageFile(fakeFile("image/png", MAX_FILE_BYTES)).ok).toBe(
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

describe("determineOutputFormat", () => {
  it("keeps PNG, JPEG, and WebP as themselves", () => {
    expect(determineOutputFormat("image/png")).toBe("image/png");
    expect(determineOutputFormat("image/jpeg")).toBe("image/jpeg");
    expect(determineOutputFormat("image/webp")).toBe("image/webp");
  });

  it("falls back to PNG for formats canvas can't re-encode", () => {
    expect(determineOutputFormat("image/bmp")).toBe("image/png");
    expect(determineOutputFormat("image/gif")).toBe("image/png");
  });
});

describe("mimeToExtension", () => {
  it("maps known output types", () => {
    expect(mimeToExtension("image/jpeg")).toBe("jpg");
    expect(mimeToExtension("image/webp")).toBe("webp");
    expect(mimeToExtension("image/png")).toBe("png");
  });

  it("falls back to png for unrecognized types", () => {
    expect(mimeToExtension("image/bmp")).toBe("png");
  });
});

describe("outputFilename", () => {
  it("replaces the original extension and appends -cleaned", () => {
    expect(outputFilename("photo.jpg", "image/jpeg")).toBe("photo-cleaned.jpg");
  });

  it("falls back to a generic name when the original has no usable name", () => {
    expect(outputFilename("", "image/png")).toBe("image-cleaned.png");
  });
});

describe("formatLabel", () => {
  it("labels known formats", () => {
    expect(formatLabel("image/jpeg")).toBe("JPEG");
    expect(formatLabel("image/gif")).toBe("GIF");
  });

  it("falls back to the subtype for unknown formats", () => {
    expect(formatLabel("image/avif")).toBe("AVIF");
  });
});

describe("compareSizes", () => {
  it("reports a smaller cleaned file", () => {
    expect(compareSizes(1000, 800)).toEqual({
      deltaBytes: -200,
      deltaPercent: 20,
      direction: "smaller",
    });
  });

  it("reports a larger cleaned file", () => {
    expect(compareSizes(1000, 1250)).toEqual({
      deltaBytes: 250,
      deltaPercent: 25,
      direction: "larger",
    });
  });

  it("reports no change when sizes are equal", () => {
    expect(compareSizes(1000, 1000)).toEqual({
      deltaBytes: 0,
      deltaPercent: 0,
      direction: "same",
    });
  });

  it("handles a zero original size without dividing by zero", () => {
    expect(compareSizes(0, 500)).toEqual({
      deltaBytes: 500,
      deltaPercent: 0,
      direction: "same",
    });
  });
});

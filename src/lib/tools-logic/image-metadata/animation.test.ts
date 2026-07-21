import { describe, expect, it } from "vitest";
import { detectAnimation, isAnimatedGif, isAnimatedWebp } from "./animation";

function bytesFromParts(parts: (number[] | string)[]): Uint8Array {
  const bytes: number[] = [];
  for (const part of parts) {
    if (typeof part === "string") {
      for (const ch of part) bytes.push(ch.charCodeAt(0));
    } else {
      bytes.push(...part);
    }
  }
  return Uint8Array.from(bytes);
}

const singleFrameGif = bytesFromParts([
  "GIF89a",
  [1, 0, 1, 0, 0, 0, 0], // logical screen descriptor, no global color table
  [0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 1, 0x41, 0], // one image frame
  [0x3b], // trailer
]);

const twoFrameGif = bytesFromParts([
  "GIF89a",
  [1, 0, 1, 0, 0, 0, 0],
  [0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 1, 0x41, 0],
  [0x2c, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 1, 0x41, 0],
  [0x3b],
]);

describe("isAnimatedGif", () => {
  it("returns false for a single-frame GIF", () => {
    expect(isAnimatedGif(singleFrameGif)).toBe(false);
  });

  it("returns true for a multi-frame GIF", () => {
    expect(isAnimatedGif(twoFrameGif)).toBe(true);
  });

  it("returns false for non-GIF bytes", () => {
    expect(isAnimatedGif(Uint8Array.from([0, 1, 2, 3]))).toBe(false);
  });
});

describe("isAnimatedWebp", () => {
  function webpWithFlags(flags: number): Uint8Array {
    return bytesFromParts([
      "RIFF",
      [0, 0, 0, 0],
      "WEBP",
      "VP8X",
      [0, 0, 0, 0],
      [flags, 0, 0, 0],
    ]);
  }

  it("returns true when the animation flag bit is set", () => {
    expect(isAnimatedWebp(webpWithFlags(0x02))).toBe(true);
  });

  it("returns false when the animation flag bit is unset", () => {
    expect(isAnimatedWebp(webpWithFlags(0x20))).toBe(false);
  });

  it("returns false for a non-WebP RIFF file", () => {
    expect(isAnimatedWebp(bytesFromParts(["RIFF", [0, 0, 0, 0], "WAVE"]))).toBe(
      false,
    );
  });
});

describe("detectAnimation", () => {
  it("dispatches to the GIF detector for image/gif", () => {
    expect(detectAnimation(twoFrameGif, "image/gif")).toBe(true);
  });

  it("returns false for formats with no animation concept", () => {
    expect(detectAnimation(singleFrameGif, "image/png")).toBe(false);
  });
});

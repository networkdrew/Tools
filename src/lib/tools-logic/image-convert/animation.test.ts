import { describe, expect, it } from "vitest";
import { detectAnimation, isAnimatedGif, isAnimatedWebp } from "./animation";

function ascii(text: string): number[] {
  return Array.from(text).map((c) => c.charCodeAt(0));
}

function bytes(...parts: number[][]): Uint8Array {
  return Uint8Array.from(parts.flat());
}

const GIF_HEADER = ascii("GIF89a");
const LOGICAL_SCREEN_DESCRIPTOR = [1, 0, 1, 0, 0, 0, 0]; // 1x1, no global color table

// Image descriptor (10 bytes: separator, left, top, width, height, packed)
// followed by minimal image data (LZW min code size, one sub-block, terminator).
const GIF_FRAME = [
  0x2c,
  0,
  0,
  0,
  0,
  1,
  0,
  1,
  0,
  0, // image descriptor, no local color table
  2,
  1,
  0x41,
  0, // LZW min code size 2, one 1-byte sub-block, terminator
];

// Graphic Control Extension: introducer, label, size, 4 data bytes, terminator.
const GIF_GRAPHIC_CONTROL_EXTENSION = [0x21, 0xf9, 4, 0, 0, 0, 0, 0];

const GIF_TRAILER = [0x3b];

function buildGif(frameCount: number, withExtension = false): Uint8Array {
  const frames: number[][] = [];
  for (let i = 0; i < frameCount; i++) {
    if (withExtension) frames.push(GIF_GRAPHIC_CONTROL_EXTENSION);
    frames.push(GIF_FRAME);
  }
  return bytes(GIF_HEADER, LOGICAL_SCREEN_DESCRIPTOR, ...frames, GIF_TRAILER);
}

describe("isAnimatedGif", () => {
  it("returns false for a single-frame GIF", () => {
    expect(isAnimatedGif(buildGif(1))).toBe(false);
  });

  it("returns false for a single-frame GIF with a graphic control extension", () => {
    expect(isAnimatedGif(buildGif(1, true))).toBe(false);
  });

  it("returns true for a multi-frame GIF", () => {
    expect(isAnimatedGif(buildGif(3))).toBe(true);
  });

  it("returns true for a multi-frame GIF with extensions between frames", () => {
    expect(isAnimatedGif(buildGif(2, true))).toBe(true);
  });

  it("returns false for a non-GIF header", () => {
    expect(isAnimatedGif(Uint8Array.from(ascii("not a gif at all")))).toBe(
      false,
    );
  });

  it("returns false for truncated/malformed data instead of throwing", () => {
    expect(() => isAnimatedGif(Uint8Array.from(GIF_HEADER))).not.toThrow();
    expect(isAnimatedGif(Uint8Array.from(GIF_HEADER))).toBe(false);
  });
});

function buildWebp(fourcc: string, flags?: number): Uint8Array {
  const riff = bytes(ascii("RIFF"), [0, 0, 0, 0], ascii("WEBP"), ascii(fourcc));
  if (fourcc !== "VP8X") {
    return bytes([...riff], [0, 0, 0, 0, 0]); // pad to satisfy the minimum length check
  }
  return bytes(
    [...riff],
    [10, 0, 0, 0], // chunk size
    [flags ?? 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // flags + reserved + canvas size
  );
}

describe("isAnimatedWebp", () => {
  it("returns false for a simple (non-extended) lossy WebP", () => {
    expect(isAnimatedWebp(buildWebp("VP8 "))).toBe(false);
  });

  it("returns false for an extended WebP without the animation flag", () => {
    expect(isAnimatedWebp(buildWebp("VP8X", 0x10))).toBe(false); // alpha only
  });

  it("returns true for an extended WebP with the animation flag", () => {
    expect(isAnimatedWebp(buildWebp("VP8X", 0x02))).toBe(true);
  });

  it("returns true when both alpha and animation flags are set", () => {
    expect(isAnimatedWebp(buildWebp("VP8X", 0x12))).toBe(true);
  });

  it("returns false for data too short to contain a VP8X chunk", () => {
    expect(isAnimatedWebp(Uint8Array.from(ascii("RIFF")))).toBe(false);
  });
});

describe("detectAnimation", () => {
  it("dispatches to the GIF detector for image/gif", () => {
    expect(detectAnimation(buildGif(3), "image/gif")).toBe(true);
  });

  it("dispatches to the WebP detector for image/webp", () => {
    expect(detectAnimation(buildWebp("VP8X", 0x02), "image/webp")).toBe(true);
  });

  it("returns false for formats with no animation concept", () => {
    expect(detectAnimation(Uint8Array.from([1, 2, 3]), "image/png")).toBe(
      false,
    );
  });
});

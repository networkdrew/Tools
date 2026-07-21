import { describe, expect, it } from "vitest";
import { findTiffBase } from "./locate";

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

function jpegSegment(marker: number, payload: number[]): number[] {
  const length = payload.length + 2;
  return [0xff, marker, (length >> 8) & 0xff, length & 0xff, ...payload];
}

const FAKE_TIFF = [0x49, 0x49, 42, 0, 8, 0, 0, 0]; // arbitrary bytes standing in for real TIFF content

describe("findTiffBase for JPEG", () => {
  it("finds an APP1 Exif segment and returns the offset right after the 'Exif\\0\\0' marker", () => {
    const bytes = bytesFromParts([
      [0xff, 0xd8],
      jpegSegment(0xe1, [0x45, 0x78, 0x69, 0x66, 0, 0, ...FAKE_TIFF]),
      [0xff, 0xda],
    ]);
    const base = findTiffBase(bytes, "image/jpeg");
    expect(base).not.toBeNull();
    expect(
      Array.from(bytes.slice(base as number, (base as number) + 8)),
    ).toEqual(FAKE_TIFF);
  });

  it("skips an APP1 XMP segment that isn't Exif", () => {
    const xmpMarker = "http://ns.adobe.com/xap/1.0/\0"
      .split("")
      .map((c) => c.charCodeAt(0));
    const bytes = bytesFromParts([
      [0xff, 0xd8],
      jpegSegment(0xe1, xmpMarker),
      [0xff, 0xda],
    ]);
    expect(findTiffBase(bytes, "image/jpeg")).toBeNull();
  });

  it("returns null for a JPEG with no APP1 segment", () => {
    const bytes = bytesFromParts([
      [0xff, 0xd8],
      jpegSegment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0]),
      [0xff, 0xda],
    ]);
    expect(findTiffBase(bytes, "image/jpeg")).toBeNull();
  });

  it("returns null for bytes that aren't a JPEG", () => {
    expect(findTiffBase(Uint8Array.from([1, 2, 3]), "image/jpeg")).toBeNull();
  });
});

describe("findTiffBase for PNG", () => {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];

  function pngChunk(type: string, data: number[] = []): number[] {
    const length = data.length;
    return [
      (length >>> 24) & 0xff,
      (length >>> 16) & 0xff,
      (length >>> 8) & 0xff,
      length & 0xff,
      ...type.split("").map((c) => c.charCodeAt(0)),
      ...data,
      0,
      0,
      0,
      0, // crc (unchecked)
    ];
  }

  it("finds an eXIf chunk with no 'Exif\\0\\0' prefix (per the PNG spec)", () => {
    const bytes = bytesFromParts([
      signature,
      pngChunk("IHDR", new Array(13).fill(0)),
      pngChunk("eXIf", FAKE_TIFF),
      pngChunk("IEND"),
    ]);
    const base = findTiffBase(bytes, "image/png");
    expect(base).not.toBeNull();
    expect(
      Array.from(bytes.slice(base as number, (base as number) + 8)),
    ).toEqual(FAKE_TIFF);
  });

  it("skips a redundant 'Exif\\0\\0' prefix if an encoder added one", () => {
    const prefixed = [0x45, 0x78, 0x69, 0x66, 0, 0, ...FAKE_TIFF];
    const bytes = bytesFromParts([
      signature,
      pngChunk("IHDR", new Array(13).fill(0)),
      pngChunk("eXIf", prefixed),
      pngChunk("IEND"),
    ]);
    const base = findTiffBase(bytes, "image/png");
    expect(
      Array.from(bytes.slice(base as number, (base as number) + 8)),
    ).toEqual(FAKE_TIFF);
  });

  it("returns null for a PNG with no eXIf chunk", () => {
    const bytes = bytesFromParts([
      signature,
      pngChunk("IHDR", new Array(13).fill(0)),
      pngChunk("IEND"),
    ]);
    expect(findTiffBase(bytes, "image/png")).toBeNull();
  });

  it("returns null for bytes that aren't a PNG", () => {
    expect(findTiffBase(Uint8Array.from([1, 2, 3]), "image/png")).toBeNull();
  });
});

describe("findTiffBase for WebP", () => {
  function riffChunk(fourCC: string, data: number[]): number[] {
    const size = data.length;
    const padded = size % 2 === 1 ? [...data, 0] : data;
    return [
      ...fourCC.split("").map((c) => c.charCodeAt(0)),
      size & 0xff,
      (size >> 8) & 0xff,
      (size >> 16) & 0xff,
      (size >> 24) & 0xff,
      ...padded,
    ];
  }

  it("finds an EXIF chunk in a RIFF/WEBP container", () => {
    const bytes = bytesFromParts([
      "RIFF",
      [0, 0, 0, 0],
      "WEBP",
      riffChunk("VP8X", [0x08, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
      riffChunk("EXIF", FAKE_TIFF),
    ]);
    const base = findTiffBase(bytes, "image/webp");
    expect(base).not.toBeNull();
    expect(
      Array.from(bytes.slice(base as number, (base as number) + 8)),
    ).toEqual(FAKE_TIFF);
  });

  it("returns null for a WebP with no EXIF chunk", () => {
    const bytes = bytesFromParts([
      "RIFF",
      [0, 0, 0, 0],
      "WEBP",
      riffChunk("VP8 ", [0, 0, 0, 0]),
    ]);
    expect(findTiffBase(bytes, "image/webp")).toBeNull();
  });

  it("returns null for bytes that aren't a WebP", () => {
    expect(findTiffBase(Uint8Array.from([1, 2, 3]), "image/webp")).toBeNull();
  });
});

describe("findTiffBase for unsupported formats", () => {
  it("returns null without attempting to parse", () => {
    expect(findTiffBase(Uint8Array.from([1, 2, 3]), "image/bmp")).toBeNull();
    expect(findTiffBase(Uint8Array.from([1, 2, 3]), "image/gif")).toBeNull();
  });
});

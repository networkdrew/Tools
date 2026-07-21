import { describe, expect, it } from "vitest";
import { detectMetadata } from "./metadata";

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

describe("detectMetadata for JPEG", () => {
  it("reports nothing for a bare JPEG with only APP0/JFIF", () => {
    const bytes = bytesFromParts([
      [0xff, 0xd8],
      jpegSegment(0xe0, [0x4a, 0x46, 0x49, 0x46, 0]),
      [0xff, 0xda], // start of scan
    ]);
    expect(detectMetadata(bytes, "image/jpeg")).toEqual({
      hasIcc: false,
      hasOther: false,
    });
  });

  it("detects an APP1 Exif segment as other metadata", () => {
    const bytes = bytesFromParts([
      [0xff, 0xd8],
      jpegSegment(0xe1, [0x45, 0x78, 0x69, 0x66, 0, 0]),
      [0xff, 0xda],
    ]);
    expect(detectMetadata(bytes, "image/jpeg")).toEqual({
      hasIcc: false,
      hasOther: true,
    });
  });

  it("detects an APP2 ICC_PROFILE segment as an ICC profile", () => {
    const bytes = bytesFromParts([
      [0xff, 0xd8],
      jpegSegment(0xe2, [
        ..."ICC_PROFILE".split("").map((c) => c.charCodeAt(0)),
        0,
        0,
      ]),
      [0xff, 0xda],
    ]);
    expect(detectMetadata(bytes, "image/jpeg")).toEqual({
      hasIcc: true,
      hasOther: false,
    });
  });

  it("returns nothing for bytes that aren't a JPEG", () => {
    expect(detectMetadata(Uint8Array.from([1, 2, 3]), "image/jpeg")).toEqual({
      hasIcc: false,
      hasOther: false,
    });
  });
});

describe("detectMetadata for PNG", () => {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];

  function pngChunk(type: string, dataLength = 0): number[] {
    return [
      0,
      0,
      0,
      dataLength,
      ...type.split("").map((c) => c.charCodeAt(0)),
      ...new Array(dataLength).fill(0),
      0,
      0,
      0,
      0, // crc (unchecked)
    ];
  }

  it("reports nothing for a PNG with only required chunks", () => {
    const bytes = bytesFromParts([
      signature,
      pngChunk("IHDR", 13),
      pngChunk("IDAT"),
      pngChunk("IEND"),
    ]);
    expect(detectMetadata(bytes, "image/png")).toEqual({
      hasIcc: false,
      hasOther: false,
    });
  });

  it("detects an iCCP chunk as an ICC profile", () => {
    const bytes = bytesFromParts([
      signature,
      pngChunk("IHDR", 13),
      pngChunk("iCCP"),
      pngChunk("IDAT"),
      pngChunk("IEND"),
    ]);
    expect(detectMetadata(bytes, "image/png")).toEqual({
      hasIcc: true,
      hasOther: false,
    });
  });

  it("detects a tEXt chunk as other metadata", () => {
    const bytes = bytesFromParts([
      signature,
      pngChunk("IHDR", 13),
      pngChunk("tEXt"),
      pngChunk("IDAT"),
      pngChunk("IEND"),
    ]);
    expect(detectMetadata(bytes, "image/png")).toEqual({
      hasIcc: false,
      hasOther: true,
    });
  });

  it("returns nothing for bytes that aren't a PNG", () => {
    expect(detectMetadata(Uint8Array.from([1, 2, 3]), "image/png")).toEqual({
      hasIcc: false,
      hasOther: false,
    });
  });
});

describe("detectMetadata for WebP", () => {
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

  it("detects the ICC flag", () => {
    expect(detectMetadata(webpWithFlags(0x20), "image/webp")).toEqual({
      hasIcc: true,
      hasOther: false,
    });
  });

  it("detects the Exif flag as other metadata", () => {
    expect(detectMetadata(webpWithFlags(0x08), "image/webp")).toEqual({
      hasIcc: false,
      hasOther: true,
    });
  });

  it("returns nothing for a simple WebP with no VP8X chunk", () => {
    const bytes = bytesFromParts(["RIFF", [0, 0, 0, 0], "WEBP", "VP8 "]);
    expect(detectMetadata(bytes, "image/webp")).toEqual({
      hasIcc: false,
      hasOther: false,
    });
  });
});

describe("detectMetadata for unsupported formats", () => {
  it("returns nothing for BMP and GIF without attempting to parse them", () => {
    const bytes = Uint8Array.from([1, 2, 3, 4]);
    expect(detectMetadata(bytes, "image/bmp")).toEqual({
      hasIcc: false,
      hasOther: false,
    });
    expect(detectMetadata(bytes, "image/gif")).toEqual({
      hasIcc: false,
      hasOther: false,
    });
  });
});

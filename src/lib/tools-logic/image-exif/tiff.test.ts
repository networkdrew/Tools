import { describe, expect, it } from "vitest";
import {
  readAsciiValue,
  readByteValue,
  readIfd,
  readLongOrShortValue,
  readRationalValue,
  readShortValue,
  readTiffHeader,
  type TiffEntry,
} from "./tiff";

function viewFrom(bytes: number[]): DataView {
  const array = Uint8Array.from(bytes);
  return new DataView(array.buffer, array.byteOffset, array.byteLength);
}

describe("readTiffHeader", () => {
  it("reads a little-endian ('II') header", () => {
    const view = viewFrom([0x49, 0x49, 42, 0, 8, 0, 0, 0]);
    expect(readTiffHeader(view, 0)).toEqual({
      littleEndian: true,
      ifd0Offset: 8,
    });
  });

  it("reads a big-endian ('MM') header", () => {
    const view = viewFrom([0x4d, 0x4d, 0, 42, 0, 0, 0, 8]);
    expect(readTiffHeader(view, 0)).toEqual({
      littleEndian: false,
      ifd0Offset: 8,
    });
  });

  it("returns null for an unrecognized byte-order mark", () => {
    const view = viewFrom([0x00, 0x00, 42, 0, 8, 0, 0, 0]);
    expect(readTiffHeader(view, 0)).toBeNull();
  });

  it("returns null for a bad magic number", () => {
    const view = viewFrom([0x49, 0x49, 0, 0, 8, 0, 0, 0]);
    expect(readTiffHeader(view, 0)).toBeNull();
  });

  it("returns null when the buffer is too short", () => {
    const view = viewFrom([0x49, 0x49, 42, 0]);
    expect(readTiffHeader(view, 0)).toBeNull();
  });
});

describe("readIfd", () => {
  it("reads a single inline SHORT entry", () => {
    const bytes = [
      1,
      0, // one entry
      0x12,
      0x01, // tag 0x0112 (Orientation), LE
      3,
      0, // type SHORT
      1,
      0,
      0,
      0, // count 1
      3,
      0,
      0,
      0, // inline value 3
      0,
      0,
      0,
      0, // next IFD offset
    ];
    const view = viewFrom(bytes);
    const ifd = readIfd(view, 0, 0, true);
    expect(ifd).not.toBeNull();
    const entry = ifd?.entries.get(0x0112);
    expect(entry).toBeDefined();
    expect(readShortValue(view, entry as TiffEntry, true)).toBe(3);
  });

  it("returns null when the IFD start is out of bounds", () => {
    const view = viewFrom([1, 0, 0, 0]);
    expect(readIfd(view, 0, 100, true)).toBeNull();
  });

  it("skips an entry whose out-of-line value would read past the buffer", () => {
    const bytes = [
      1,
      0, // one entry
      0x0f,
      0x01, // tag 0x010f (Make)
      2,
      0, // type ASCII
      20,
      0,
      0,
      0, // count 20 (way more than buffer holds)
      99,
      0,
      0,
      0, // bogus out-of-line offset
      0,
      0,
      0,
      0,
    ];
    const view = viewFrom(bytes);
    const ifd = readIfd(view, 0, 0, true);
    expect(ifd?.entries.size).toBe(0);
  });

  it("reads the next-IFD offset", () => {
    const bytes = [
      0,
      0, // zero entries
      42,
      0,
      0,
      0, // next IFD offset
    ];
    const view = viewFrom(bytes);
    const ifd = readIfd(view, 0, 0, true);
    expect(ifd?.nextOffset).toBe(42);
  });
});

describe("readAsciiValue", () => {
  it("reads a null-terminated ASCII string", () => {
    const bytes = [67, 97, 110, 111, 110, 0]; // "Canon\0"
    const view = viewFrom(bytes);
    const entry: TiffEntry = { tag: 0, type: 2, count: 6, dataOffset: 0 };
    expect(readAsciiValue(view, entry)).toBe("Canon");
  });

  it("returns undefined for an all-null (empty) string", () => {
    const view = viewFrom([0, 0, 0]);
    const entry: TiffEntry = { tag: 0, type: 2, count: 3, dataOffset: 0 };
    expect(readAsciiValue(view, entry)).toBeUndefined();
  });

  it("returns undefined for a non-ASCII type", () => {
    const view = viewFrom([3, 0]);
    const entry: TiffEntry = { tag: 0, type: 3, count: 1, dataOffset: 0 };
    expect(readAsciiValue(view, entry)).toBeUndefined();
  });
});

describe("readRationalValue", () => {
  it("divides numerator by denominator for an unsigned RATIONAL", () => {
    const view = viewFrom([1, 0, 0, 0, 8, 0, 0, 0]); // 1/8
    const entry: TiffEntry = { tag: 0, type: 5, count: 1, dataOffset: 0 };
    expect(readRationalValue(view, entry, true)).toBe(0.125);
  });

  it("handles a negative SRATIONAL", () => {
    const bytes = new Uint8Array(8);
    new DataView(bytes.buffer).setInt32(0, -3, true);
    new DataView(bytes.buffer).setInt32(4, 2, true);
    const view = new DataView(bytes.buffer);
    const entry: TiffEntry = { tag: 0, type: 10, count: 1, dataOffset: 0 };
    expect(readRationalValue(view, entry, true)).toBe(-1.5);
  });

  it("returns undefined when the denominator is zero", () => {
    const view = viewFrom([5, 0, 0, 0, 0, 0, 0, 0]);
    const entry: TiffEntry = { tag: 0, type: 5, count: 1, dataOffset: 0 };
    expect(readRationalValue(view, entry, true)).toBeUndefined();
  });

  it("reads the Nth rational in a multi-value entry (e.g. GPS DMS)", () => {
    const view = viewFrom([
      37,
      0,
      0,
      0,
      1,
      0,
      0,
      0, // 37/1
      30,
      0,
      0,
      0,
      1,
      0,
      0,
      0, // 30/1
    ]);
    const entry: TiffEntry = { tag: 0, type: 5, count: 2, dataOffset: 0 };
    expect(readRationalValue(view, entry, true, 0)).toBe(37);
    expect(readRationalValue(view, entry, true, 1)).toBe(30);
  });
});

describe("readLongOrShortValue", () => {
  it("reads a SHORT", () => {
    const view = viewFrom([200, 0]);
    const entry: TiffEntry = { tag: 0, type: 3, count: 1, dataOffset: 0 };
    expect(readLongOrShortValue(view, entry, true)).toBe(200);
  });

  it("reads a LONG", () => {
    const view = viewFrom([0, 1, 0, 0]); // 256 LE
    const entry: TiffEntry = { tag: 0, type: 4, count: 1, dataOffset: 0 };
    expect(readLongOrShortValue(view, entry, true)).toBe(256);
  });

  it("returns undefined for an unsupported type", () => {
    const view = viewFrom([1]);
    const entry: TiffEntry = { tag: 0, type: 2, count: 1, dataOffset: 0 };
    expect(readLongOrShortValue(view, entry, true)).toBeUndefined();
  });
});

describe("readByteValue", () => {
  it("reads a BYTE value", () => {
    const view = viewFrom([1]);
    const entry: TiffEntry = { tag: 0, type: 1, count: 1, dataOffset: 0 };
    expect(readByteValue(view, entry)).toBe(1);
  });

  it("returns undefined for an out-of-range index", () => {
    const view = viewFrom([1]);
    const entry: TiffEntry = { tag: 0, type: 1, count: 1, dataOffset: 0 };
    expect(readByteValue(view, entry, 5)).toBeUndefined();
  });
});

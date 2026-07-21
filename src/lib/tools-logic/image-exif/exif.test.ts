import { describe, expect, it } from "vitest";
import { extractExif } from "./exif";

// --- Minimal little-endian TIFF/IFD builder, used only to construct
// realistic EXIF payloads for these tests. ---

type Field =
  | { tag: number; type: 2; ascii: string }
  | { tag: number; type: 3; short: number }
  | { tag: number; type: 4; long: number }
  | { tag: number; type: 5 | 10; rational: [number, number][] }
  | { tag: number; type: 1; byte: number };

function fieldValueBytes(f: Field): number[] {
  switch (f.type) {
    case 2:
      return [...Array.from(f.ascii).map((c) => c.charCodeAt(0)), 0];
    case 3:
      return [f.short & 0xff, (f.short >> 8) & 0xff];
    case 4:
      return [
        f.long & 0xff,
        (f.long >> 8) & 0xff,
        (f.long >> 16) & 0xff,
        (f.long >> 24) & 0xff,
      ];
    case 5:
    case 10: {
      const out: number[] = [];
      for (const [num, den] of f.rational) {
        out.push(
          num & 0xff,
          (num >> 8) & 0xff,
          (num >> 16) & 0xff,
          (num >> 24) & 0xff,
        );
        out.push(
          den & 0xff,
          (den >> 8) & 0xff,
          (den >> 16) & 0xff,
          (den >> 24) & 0xff,
        );
      }
      return out;
    }
    case 1:
      return [f.byte];
  }
}

function fieldCount(f: Field): number {
  if (f.type === 2) return f.ascii.length + 1;
  if (f.type === 5 || f.type === 10) return f.rational.length;
  return 1;
}

/** Serializes one IFD at `base` (offset within the eventual full TIFF byte array). */
function serializeIfd(
  fields: Field[],
  base: number,
): { bytes: number[]; pointerSlot: (tag: number) => number } {
  const headerLen = 2 + fields.length * 12 + 4;
  const entries: number[][] = [];
  const outOfLine: number[] = [];
  const slots = new Map<number, number>();
  let cursor = base + headerLen;

  fields.forEach((f, i) => {
    const valueBytes = fieldValueBytes(f);
    const count = fieldCount(f);
    const entry: number[] = [
      f.tag & 0xff,
      (f.tag >> 8) & 0xff,
      f.type & 0xff,
      (f.type >> 8) & 0xff,
      count & 0xff,
      (count >> 8) & 0xff,
      (count >> 16) & 0xff,
      (count >> 24) & 0xff,
    ];
    slots.set(f.tag, base + 2 + i * 12 + 8);

    if (valueBytes.length <= 4) {
      const padded = [...valueBytes];
      while (padded.length < 4) padded.push(0);
      entry.push(...padded);
    } else {
      entry.push(
        cursor & 0xff,
        (cursor >> 8) & 0xff,
        (cursor >> 16) & 0xff,
        (cursor >> 24) & 0xff,
      );
      outOfLine.push(...valueBytes);
      cursor += valueBytes.length;
    }
    entries.push(entry);
  });

  const bytes: number[] = [fields.length & 0xff, (fields.length >> 8) & 0xff];
  for (const e of entries) bytes.push(...e);
  bytes.push(0, 0, 0, 0); // next IFD offset
  bytes.push(...outOfLine);

  return { bytes, pointerSlot: (tag: number) => slots.get(tag) as number };
}

function patchLong(full: number[], slot: number, value: number) {
  full[slot] = value & 0xff;
  full[slot + 1] = (value >> 8) & 0xff;
  full[slot + 2] = (value >> 16) & 0xff;
  full[slot + 3] = (value >> 24) & 0xff;
}

const TAG = {
  MAKE: 0x010f,
  MODEL: 0x0110,
  ORIENTATION: 0x0112,
  SOFTWARE: 0x0131,
  DATETIME: 0x0132,
  EXIF_IFD_POINTER: 0x8769,
  GPS_IFD_POINTER: 0x8825,
  EXPOSURE_TIME: 0x829a,
  FNUMBER: 0x829d,
  ISO: 0x8827,
  DATETIME_ORIGINAL: 0x9003,
  FLASH: 0x9209,
  FOCAL_LENGTH: 0x920a,
  COLOR_SPACE: 0xa001,
  LENS_MODEL: 0xa434,
  GPS_LAT_REF: 0x0001,
  GPS_LAT: 0x0002,
  GPS_LON_REF: 0x0003,
  GPS_LON: 0x0004,
  GPS_ALT_REF: 0x0005,
  GPS_ALT: 0x0006,
};

function buildTiff(options: {
  ifd0?: Field[];
  exif?: Field[];
  gps?: Field[];
}): Uint8Array {
  const ifd0Fields: Field[] = [...(options.ifd0 ?? [])];
  if (options.exif)
    ifd0Fields.push({ tag: TAG.EXIF_IFD_POINTER, type: 4, long: 0 });
  if (options.gps)
    ifd0Fields.push({ tag: TAG.GPS_IFD_POINTER, type: 4, long: 0 });

  const ifd0Base = 8;
  const ifd0 = serializeIfd(ifd0Fields, ifd0Base);
  const full = [0x49, 0x49, 42, 0, ifd0Base & 0xff, 0, 0, 0, ...ifd0.bytes];

  let exifBase = 0;
  if (options.exif) {
    exifBase = full.length;
    const exif = serializeIfd(options.exif, exifBase);
    full.push(...exif.bytes);
    patchLong(full, ifd0.pointerSlot(TAG.EXIF_IFD_POINTER), exifBase);
  }

  if (options.gps) {
    const gpsBase = full.length;
    const gps = serializeIfd(options.gps, gpsBase);
    full.push(...gps.bytes);
    patchLong(full, ifd0.pointerSlot(TAG.GPS_IFD_POINTER), gpsBase);
  }
  void exifBase;

  return Uint8Array.from(full);
}

function wrapInJpeg(tiff: Uint8Array): Uint8Array {
  const exifHeader = [0x45, 0x78, 0x69, 0x66, 0, 0]; // "Exif\0\0"
  const payload = [...exifHeader, ...Array.from(tiff)];
  const length = payload.length + 2;
  return Uint8Array.from([
    0xff,
    0xd8,
    0xff,
    0xe1,
    (length >> 8) & 0xff,
    length & 0xff,
    ...payload,
    0xff,
    0xda,
  ]);
}

function rational(value: number, precision = 1000): [number, number] {
  return [Math.round(value * precision), precision];
}

const DIMENSIONS = { width: 4032, height: 3024 };

describe("extractExif", () => {
  it("reports no metadata for a JPEG with no EXIF block", () => {
    const bytes = Uint8Array.from([0xff, 0xd8, 0xff, 0xda]);
    const result = extractExif(bytes, "image/jpeg", DIMENSIONS, false);
    expect(result.hasMetadata).toBe(false);
    expect(result.camera).toEqual([]);
    expect(result.capture).toEqual([]);
    expect(result.gps).toEqual([]);
    expect(result.gpsCoordinates).toBeNull();
    expect(result.image).toEqual([
      { label: "Dimensions", value: "4032 × 3024 px" },
      { label: "Color Profile", value: "None detected" },
    ]);
  });

  it("extracts camera, capture, and image fields from a full EXIF block", () => {
    const tiff = buildTiff({
      ifd0: [
        { tag: TAG.MAKE, type: 2, ascii: "Canon" },
        { tag: TAG.MODEL, type: 2, ascii: "EOS 80D" },
        { tag: TAG.SOFTWARE, type: 2, ascii: "GIMP 2.10" },
        { tag: TAG.DATETIME, type: 2, ascii: "2024:03:15 14:22:10" },
        { tag: TAG.ORIENTATION, type: 3, short: 6 },
      ],
      exif: [
        { tag: TAG.DATETIME_ORIGINAL, type: 2, ascii: "2024:03:15 14:20:00" },
        { tag: TAG.LENS_MODEL, type: 2, ascii: "EF-S 18-135mm" },
        {
          tag: TAG.EXPOSURE_TIME,
          type: 5,
          rational: [rational(1 / 125, 1000000)],
        },
        { tag: TAG.FNUMBER, type: 5, rational: [rational(2.8)] },
        { tag: TAG.ISO, type: 3, short: 400 },
        { tag: TAG.FOCAL_LENGTH, type: 5, rational: [rational(50)] },
        { tag: TAG.FLASH, type: 3, short: 0 },
        { tag: TAG.COLOR_SPACE, type: 3, short: 1 },
      ],
    });
    const bytes = wrapInJpeg(tiff);
    const result = extractExif(bytes, "image/jpeg", DIMENSIONS, true);

    expect(result.hasMetadata).toBe(true);
    expect(result.camera).toEqual([
      { label: "Make", value: "Canon" },
      { label: "Model", value: "EOS 80D" },
      { label: "Software", value: "GIMP 2.10" },
      { label: "Lens Model", value: "EF-S 18-135mm" },
    ]);
    expect(result.capture).toEqual([
      { label: "Date Taken", value: "2024-03-15 14:20:00" },
      { label: "Exposure Time", value: "1/125 s" },
      { label: "Aperture", value: "f/2.8" },
      { label: "ISO", value: "ISO 400" },
      { label: "Focal Length", value: "50 mm" },
      { label: "Flash", value: "Flash did not fire" },
    ]);
    expect(result.image).toEqual([
      { label: "Dimensions", value: "4032 × 3024 px" },
      { label: "Orientation", value: "6 — Rotated 90° CW" },
      { label: "Color Space", value: "sRGB" },
      { label: "Color Profile", value: "Embedded ICC profile detected" },
    ]);
    expect(result.gps).toEqual([]);
    expect(result.gpsCoordinates).toBeNull();
  });

  it("falls back to IFD0 DateTime when DateTimeOriginal is absent", () => {
    const tiff = buildTiff({
      ifd0: [{ tag: TAG.DATETIME, type: 2, ascii: "2020:01:01 00:00:00" }],
    });
    const result = extractExif(
      wrapInJpeg(tiff),
      "image/jpeg",
      DIMENSIONS,
      false,
    );
    expect(result.capture).toEqual([
      { label: "Date Taken", value: "2020-01-01 00:00:00" },
    ]);
  });

  it("extracts GPS coordinates, labels them, and builds a map URL", () => {
    const tiff = buildTiff({
      ifd0: [],
      gps: [
        { tag: TAG.GPS_LAT_REF, type: 2, ascii: "N" },
        {
          tag: TAG.GPS_LAT,
          type: 5,
          rational: [rational(37), rational(46), rational(29.64, 100)],
        },
        { tag: TAG.GPS_LON_REF, type: 2, ascii: "W" },
        {
          tag: TAG.GPS_LON,
          type: 5,
          rational: [rational(122), rational(25), rational(9.84, 100)],
        },
        { tag: TAG.GPS_ALT_REF, type: 1, byte: 0 },
        { tag: TAG.GPS_ALT, type: 5, rational: [rational(15.5)] },
      ],
    });
    const result = extractExif(
      wrapInJpeg(tiff),
      "image/jpeg",
      DIMENSIONS,
      false,
    );

    expect(result.hasMetadata).toBe(true);
    expect(result.gpsCoordinates).not.toBeNull();
    expect(result.gpsCoordinates?.latitude).toBeCloseTo(37.7749, 3);
    expect(result.gpsCoordinates?.longitude).toBeCloseTo(-122.419, 2);
    expect(result.gpsCoordinates?.mapUrl).toContain("openstreetmap.org");
    expect(result.gps.find((f) => f.label === "Latitude")?.value).toMatch(
      /° N$/,
    );
    expect(result.gps.find((f) => f.label === "Longitude")?.value).toMatch(
      /° W$/,
    );
    expect(result.gps.find((f) => f.label === "Altitude")?.value).toBe(
      "15.5 m above sea level",
    );
  });

  it("does not surface GPS data when no GPS IFD is present", () => {
    const tiff = buildTiff({
      ifd0: [{ tag: TAG.MAKE, type: 2, ascii: "Nikon" }],
    });
    const result = extractExif(
      wrapInJpeg(tiff),
      "image/jpeg",
      DIMENSIONS,
      false,
    );
    expect(result.gps).toEqual([]);
    expect(result.gpsCoordinates).toBeNull();
  });

  it("degrades to 'no metadata' instead of throwing on a truncated EXIF block", () => {
    const bytes = Uint8Array.from([
      0xff, 0xd8, 0xff, 0xe1, 0, 8, 0x45, 0x78, 0x69, 0x66, 0, 0, 0xff, 0xda,
    ]);
    expect(() =>
      extractExif(bytes, "image/jpeg", DIMENSIONS, false),
    ).not.toThrow();
    const result = extractExif(bytes, "image/jpeg", DIMENSIONS, false);
    expect(result.hasMetadata).toBe(false);
  });

  it("parses a PNG's eXIf chunk the same way", () => {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10];
    function pngChunk(type: string, data: number[]): number[] {
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
        0,
      ];
    }
    const tiff = buildTiff({
      ifd0: [{ tag: TAG.MAKE, type: 2, ascii: "Sony" }],
    });
    const bytes = Uint8Array.from([
      ...signature,
      ...pngChunk("IHDR", new Array(13).fill(0)),
      ...pngChunk("eXIf", Array.from(tiff)),
      ...pngChunk("IEND", []),
    ]);
    const result = extractExif(bytes, "image/png", DIMENSIONS, false);
    expect(result.camera).toEqual([{ label: "Make", value: "Sony" }]);
  });

  it("parses a WebP's EXIF chunk the same way", () => {
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
    const tiff = buildTiff({
      ifd0: [{ tag: TAG.MAKE, type: 2, ascii: "Fujifilm" }],
    });
    const bytes = Uint8Array.from([
      ...Array.from("RIFF").map((c) => c.charCodeAt(0)),
      0,
      0,
      0,
      0,
      ...Array.from("WEBP").map((c) => c.charCodeAt(0)),
      ...riffChunk("EXIF", Array.from(tiff)),
    ]);
    const result = extractExif(bytes, "image/webp", DIMENSIONS, false);
    expect(result.camera).toEqual([{ label: "Make", value: "Fujifilm" }]);
  });
});

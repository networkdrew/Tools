/**
 * Generic TIFF/IFD reader — the structure EXIF metadata is always encoded in,
 * regardless of which container (JPEG APP1, PNG eXIf, WebP EXIF chunk) it
 * came from. Every read is bounds-checked against the underlying buffer so a
 * truncated or malformed segment degrades to "tag not found" rather than
 * throwing.
 */

export interface TiffEntry {
  tag: number;
  type: number;
  count: number;
  /** Absolute byte offset into the DataView where this entry's value data begins. */
  dataOffset: number;
}

export interface Ifd {
  entries: Map<number, TiffEntry>;
  nextOffset: number;
}

export interface TiffHeader {
  littleEndian: boolean;
  ifd0Offset: number;
}

/** Bytes per component for each TIFF field type (0 for unknown/unsupported types). */
function typeSize(type: number): number {
  switch (type) {
    case 1: // BYTE
    case 2: // ASCII
    case 6: // SBYTE
    case 7: // UNDEFINED
      return 1;
    case 3: // SHORT
    case 8: // SSHORT
      return 2;
    case 4: // LONG
    case 9: // SLONG
    case 11: // FLOAT
      return 4;
    case 5: // RATIONAL
    case 10: // SRATIONAL
    case 12: // DOUBLE
      return 8;
    default:
      return 0;
  }
}

/** Reads the "II"/"MM" byte-order mark, magic number, and IFD0 offset at `base`. */
export function readTiffHeader(
  view: DataView,
  base: number,
): TiffHeader | null {
  if (base < 0 || base + 8 > view.byteLength) return null;

  const b0 = view.getUint8(base);
  const b1 = view.getUint8(base + 1);
  let littleEndian: boolean;
  if (b0 === 0x49 && b1 === 0x49) littleEndian = true;
  else if (b0 === 0x4d && b1 === 0x4d) littleEndian = false;
  else return null;

  if (view.getUint16(base + 2, littleEndian) !== 42) return null;

  const ifd0Offset = view.getUint32(base + 4, littleEndian);
  return { littleEndian, ifd0Offset };
}

/** Reads one IFD's entries, skipping any entry whose value would read out of bounds. */
export function readIfd(
  view: DataView,
  base: number,
  offset: number,
  littleEndian: boolean,
): Ifd | null {
  const ifdStart = base + offset;
  if (ifdStart < 0 || ifdStart + 2 > view.byteLength) return null;

  const count = view.getUint16(ifdStart, littleEndian);
  const entries = new Map<number, TiffEntry>();
  const entriesEnd = ifdStart + 2 + count * 12;

  for (let i = 0; i < count; i++) {
    const entryOffset = ifdStart + 2 + i * 12;
    if (entryOffset + 12 > view.byteLength) break;

    const tag = view.getUint16(entryOffset, littleEndian);
    const type = view.getUint16(entryOffset + 2, littleEndian);
    const entryCount = view.getUint32(entryOffset + 4, littleEndian);
    const size = typeSize(type) * entryCount;
    if (size === 0) continue;

    const dataOffset =
      size <= 4
        ? entryOffset + 8
        : base + view.getUint32(entryOffset + 8, littleEndian);

    if (dataOffset < 0 || dataOffset + size > view.byteLength) continue;
    entries.set(tag, { tag, type, count: entryCount, dataOffset });
  }

  const nextOffset =
    entriesEnd + 4 <= view.byteLength
      ? view.getUint32(entriesEnd, littleEndian)
      : 0;

  return { entries, nextOffset };
}

export function readAsciiValue(
  view: DataView,
  entry: TiffEntry,
): string | undefined {
  if (entry.type !== 2) return undefined;
  let result = "";
  for (let i = 0; i < entry.count; i++) {
    const code = view.getUint8(entry.dataOffset + i);
    if (code === 0) break;
    result += String.fromCharCode(code);
  }
  const trimmed = result.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function readShortValue(
  view: DataView,
  entry: TiffEntry,
  littleEndian: boolean,
  index = 0,
): number | undefined {
  if (entry.type !== 3 || index >= entry.count) return undefined;
  return view.getUint16(entry.dataOffset + index * 2, littleEndian);
}

export function readLongOrShortValue(
  view: DataView,
  entry: TiffEntry,
  littleEndian: boolean,
  index = 0,
): number | undefined {
  if (index >= entry.count) return undefined;
  if (entry.type === 4)
    return view.getUint32(entry.dataOffset + index * 4, littleEndian);
  if (entry.type === 3)
    return view.getUint16(entry.dataOffset + index * 2, littleEndian);
  return undefined;
}

export function readRationalValue(
  view: DataView,
  entry: TiffEntry,
  littleEndian: boolean,
  index = 0,
): number | undefined {
  if (entry.type !== 5 && entry.type !== 10) return undefined;
  if (index >= entry.count) return undefined;

  const offset = entry.dataOffset + index * 8;
  const numerator =
    entry.type === 5
      ? view.getUint32(offset, littleEndian)
      : view.getInt32(offset, littleEndian);
  const denominator =
    entry.type === 5
      ? view.getUint32(offset + 4, littleEndian)
      : view.getInt32(offset + 4, littleEndian);

  if (denominator === 0) return undefined;
  return numerator / denominator;
}

export function readByteValue(
  view: DataView,
  entry: TiffEntry,
  index = 0,
): number | undefined {
  if ((entry.type !== 1 && entry.type !== 7) || index >= entry.count)
    return undefined;
  return view.getUint8(entry.dataOffset + index);
}

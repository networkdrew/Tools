/**
 * Finds the byte offset where a raw TIFF-structured EXIF block begins inside
 * a JPEG, PNG, or WebP file, so `tiff.ts` can read it without caring which
 * container it came from. Returns null (never throws) when no EXIF block is
 * present or the container is malformed — the caller treats that the same as
 * "no metadata found".
 */
import { readAscii } from "@/lib/tools-logic/image-metadata/bytes";

const EXIF_HEADER = "Exif\0\0";

/** JPEG APP1 segments carry both Exif and XMP; only the one starting with "Exif\0\0" is TIFF data. */
function findJpegExifBase(bytes: Uint8Array): number | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;

  let pos = 2;
  while (pos + 1 < bytes.length) {
    if (bytes[pos] !== 0xff) {
      pos++;
      continue;
    }
    const marker = bytes[pos + 1] ?? 0;

    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      pos += 2;
      continue;
    }
    if (marker === 0xda) break; // start of scan — no more marker segments

    if (pos + 4 > bytes.length) break;
    const length = ((bytes[pos + 2] ?? 0) << 8) | (bytes[pos + 3] ?? 0);
    const segmentStart = pos + 4;

    if (marker === 0xe1 && readAscii(bytes, segmentStart, 6) === EXIF_HEADER) {
      return segmentStart + 6;
    }

    pos = segmentStart + length - 2;
  }
  return null;
}

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];

/** Per the PNG extensions spec, the eXIf chunk holds raw TIFF data with no "Exif\0\0" prefix — but some encoders add one anyway. */
function findPngExifBase(bytes: Uint8Array): number | null {
  if (bytes.length < 8) return null;
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return null;
  }

  let pos = 8;
  while (pos + 8 <= bytes.length) {
    const length =
      (((bytes[pos] ?? 0) << 24) |
        ((bytes[pos + 1] ?? 0) << 16) |
        ((bytes[pos + 2] ?? 0) << 8) |
        (bytes[pos + 3] ?? 0)) >>>
      0;
    const type = readAscii(bytes, pos + 4, 4);
    const dataStart = pos + 8;

    if (type === "eXIf") {
      if (readAscii(bytes, dataStart, 6) === EXIF_HEADER) return dataStart + 6;
      return dataStart;
    }

    if (type === "IEND" || length > bytes.length) break;
    pos = dataStart + length + 4; // data + CRC
  }
  return null;
}

/** Walks RIFF chunks looking for an EXIF chunk; WebP's spec says no "Exif\0\0" prefix, but some encoders include one. */
function findWebpExifBase(bytes: Uint8Array): number | null {
  if (bytes.length < 12) return null;
  if (readAscii(bytes, 0, 4) !== "RIFF" || readAscii(bytes, 8, 4) !== "WEBP") {
    return null;
  }

  let pos = 12;
  while (pos + 8 <= bytes.length) {
    const fourCC = readAscii(bytes, pos, 4);
    const size =
      ((bytes[pos + 4] ?? 0) |
        ((bytes[pos + 5] ?? 0) << 8) |
        ((bytes[pos + 6] ?? 0) << 16) |
        ((bytes[pos + 7] ?? 0) << 24)) >>>
      0;
    const dataStart = pos + 8;

    if (fourCC === "EXIF") {
      if (readAscii(bytes, dataStart, 6) === EXIF_HEADER) return dataStart + 6;
      return dataStart;
    }

    pos = dataStart + size + (size % 2); // chunks are padded to an even boundary
    if (pos <= dataStart) break;
  }
  return null;
}

export function findTiffBase(
  bytes: Uint8Array,
  mimeType: string,
): number | null {
  if (mimeType === "image/jpeg") return findJpegExifBase(bytes);
  if (mimeType === "image/png") return findPngExifBase(bytes);
  if (mimeType === "image/webp") return findWebpExifBase(bytes);
  return null;
}

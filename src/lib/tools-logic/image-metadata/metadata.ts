/**
 * Structural sniffing for whether common metadata containers (EXIF, XMP,
 * IPTC, text comments, embedded ICC color profiles) are present in a file,
 * purely to describe what's about to be removed. Detection isn't required
 * for correctness — cleaning always fully re-encodes the image regardless
 * of what this finds — so unsupported formats (BMP, GIF) safely report
 * nothing rather than attempting a fragile parse.
 */
import { readAscii } from "./bytes";

export interface MetadataFlags {
  /** An embedded ICC color profile was found. */
  hasIcc: boolean;
  /** Some other metadata (EXIF, XMP, IPTC, text comments, timestamps) was found. */
  hasOther: boolean;
}

const NONE: MetadataFlags = { hasIcc: false, hasOther: false };

/** Walks JPEG marker segments up to the start of scan data (SOS), classifying APPn/COM segments. */
function detectJpegMetadata(bytes: Uint8Array): MetadataFlags {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return NONE;

  let pos = 2;
  let hasIcc = false;
  let hasOther = false;

  while (pos + 1 < bytes.length) {
    if (bytes[pos] !== 0xff) {
      pos++;
      continue;
    }
    const marker = bytes[pos + 1] ?? 0;

    // Markers with no payload: TEM, RSTn, and padding fill bytes.
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
      pos += 2;
      continue;
    }

    // SOS (start of scan) — entropy-coded data follows, stop parsing.
    if (marker === 0xda) break;

    if (pos + 4 > bytes.length) break;
    const length = ((bytes[pos + 2] ?? 0) << 8) | (bytes[pos + 3] ?? 0);
    const segmentStart = pos + 4;

    if (
      marker === 0xe2 &&
      readAscii(bytes, segmentStart, 11) === "ICC_PROFILE"
    ) {
      hasIcc = true;
    } else if (marker === 0xe1 || marker === 0xed || marker === 0xfe) {
      // APP1 (Exif/XMP), APP13 (Photoshop/IPTC), or a comment segment.
      hasOther = true;
    } else if (marker >= 0xe0 && marker <= 0xef && marker !== 0xe0) {
      // Any other APPn besides APP0 (plain JFIF, not privacy-relevant).
      hasOther = true;
    }

    pos = segmentStart + length - 2;
  }

  return { hasIcc, hasOther };
}

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const PNG_METADATA_CHUNKS = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);

/** Walks PNG chunks, classifying iCCP (color profile) and known metadata chunk types. */
function detectPngMetadata(bytes: Uint8Array): MetadataFlags {
  if (bytes.length < 8) return NONE;
  for (let i = 0; i < 8; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) return NONE;
  }

  let pos = 8;
  let hasIcc = false;
  let hasOther = false;

  while (pos + 8 <= bytes.length) {
    const length =
      (((bytes[pos] ?? 0) << 24) |
        ((bytes[pos + 1] ?? 0) << 16) |
        ((bytes[pos + 2] ?? 0) << 8) |
        (bytes[pos + 3] ?? 0)) >>>
      0;
    const type = readAscii(bytes, pos + 4, 4);

    if (type === "iCCP") hasIcc = true;
    else if (PNG_METADATA_CHUNKS.has(type)) hasOther = true;

    if (type === "IEND" || length > bytes.length) break;
    pos += 8 + length + 4; // length field + type + data + CRC
  }

  return { hasIcc, hasOther };
}

/** Reads the VP8X extended-format chunk's ICC/Exif/XMP flags, if present. */
function detectWebpMetadata(bytes: Uint8Array): MetadataFlags {
  if (bytes.length < 21) return NONE;
  if (readAscii(bytes, 0, 4) !== "RIFF" || readAscii(bytes, 8, 4) !== "WEBP") {
    return NONE;
  }
  if (readAscii(bytes, 12, 4) !== "VP8X") return NONE;

  const flags = bytes[20] ?? 0;
  return {
    hasIcc: (flags & 0x20) !== 0,
    hasOther: (flags & 0x08) !== 0 || (flags & 0x04) !== 0,
  };
}

export function detectMetadata(
  bytes: Uint8Array,
  mimeType: string,
): MetadataFlags {
  if (mimeType === "image/jpeg") return detectJpegMetadata(bytes);
  if (mimeType === "image/png") return detectPngMetadata(bytes);
  if (mimeType === "image/webp") return detectWebpMetadata(bytes);
  return NONE;
}

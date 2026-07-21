/**
 * Lightweight structural sniffing for whether a GIF or WebP file has more
 * than one frame — enough to warn before conversion flattens it, without
 * pulling in a full image-decoding library.
 */

function readAscii(bytes: Uint8Array, offset: number, length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += String.fromCharCode(bytes[offset + i] ?? 0);
  }
  return result;
}

function skipGifSubBlocks(bytes: Uint8Array, start: number): number {
  let pos = start;
  while (pos < bytes.length) {
    const size = bytes[pos];
    pos += 1;
    if (!size) break;
    pos += size;
  }
  return pos;
}

/** Walks the GIF block structure and reports whether it contains more than one image frame. */
export function isAnimatedGif(bytes: Uint8Array): boolean {
  if (bytes.length < 13) return false;
  const header = readAscii(bytes, 0, 6);
  if (header !== "GIF87a" && header !== "GIF89a") return false;

  const screenPacked = bytes[10] ?? 0;
  const hasGlobalColorTable = (screenPacked & 0x80) !== 0;
  const globalColorTableSize = hasGlobalColorTable
    ? 2 ** ((screenPacked & 0x07) + 1)
    : 0;

  let pos = 13 + globalColorTableSize * 3;
  let frameCount = 0;

  while (pos < bytes.length) {
    const blockType = bytes[pos];

    if (blockType === 0x21) {
      // Extension block: introducer + label, then sub-blocks.
      pos += 2;
      pos = skipGifSubBlocks(bytes, pos);
      continue;
    }

    if (blockType === 0x2c) {
      frameCount++;
      if (frameCount > 1) return true;

      if (pos + 9 >= bytes.length) return false;
      const imagePacked = bytes[pos + 9] ?? 0;
      const hasLocalColorTable = (imagePacked & 0x80) !== 0;
      const localColorTableSize = hasLocalColorTable
        ? 2 ** ((imagePacked & 0x07) + 1)
        : 0;

      pos += 10 + localColorTableSize * 3;
      pos += 1; // LZW minimum code size
      pos = skipGifSubBlocks(bytes, pos);
      continue;
    }

    // Trailer (0x3b) or unrecognized/malformed data — stop scanning either way.
    break;
  }

  return frameCount > 1;
}

/** Reads the VP8X extended-format chunk's animation flag, if present. */
export function isAnimatedWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 21) return false;
  if (readAscii(bytes, 0, 4) !== "RIFF" || readAscii(bytes, 8, 4) !== "WEBP") {
    return false;
  }
  if (readAscii(bytes, 12, 4) !== "VP8X") return false;

  const flags = bytes[20] ?? 0;
  return (flags & 0x02) !== 0;
}

export function detectAnimation(bytes: Uint8Array, mimeType: string): boolean {
  if (mimeType === "image/gif") return isAnimatedGif(bytes);
  if (mimeType === "image/webp") return isAnimatedWebp(bytes);
  return false;
}

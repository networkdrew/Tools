import type { RGBAImage } from "./inpaint";
import type { PixelBBox, RasterizedMask } from "./maskOps";

/** Extracts an interleaved RGB (alpha dropped) sub-region of `image` at `cropRect`, zero-padding any part outside the image bounds. */
export function extractCropRGB(
  image: RGBAImage,
  cropRect: PixelBBox,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(cropRect.width * cropRect.height * 3);
  for (let y = 0; y < cropRect.height; y++) {
    const imageY = cropRect.y + y;
    if (imageY < 0 || imageY >= image.height) continue;
    for (let x = 0; x < cropRect.width; x++) {
      const imageX = cropRect.x + x;
      if (imageX < 0 || imageX >= image.width) continue;
      const srcIdx = (imageY * image.width + imageX) * 4;
      const destIdx = (y * cropRect.width + x) * 3;
      out[destIdx] = image.data[srcIdx] ?? 0;
      out[destIdx + 1] = image.data[srcIdx + 1] ?? 0;
      out[destIdx + 2] = image.data[srcIdx + 2] ?? 0;
    }
  }
  return out;
}

/**
 * Places a bbox-local mask (as produced by `rasterizeOperation`) into a
 * crop's coordinate space, filling 0 everywhere the crop extends beyond the
 * mask's own bbox (the crop is usually larger, for model context).
 */
export function extractCropMask(
  mask: RasterizedMask,
  cropRect: PixelBBox,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(cropRect.width * cropRect.height);
  const { bbox } = mask;
  for (let y = 0; y < cropRect.height; y++) {
    const imageY = cropRect.y + y;
    const maskY = imageY - bbox.y;
    if (maskY < 0 || maskY >= bbox.height) continue;
    for (let x = 0; x < cropRect.width; x++) {
      const imageX = cropRect.x + x;
      const maskX = imageX - bbox.x;
      if (maskX < 0 || maskX >= bbox.width) continue;
      out[y * cropRect.width + x] = mask.mask[maskY * bbox.width + maskX] ?? 0;
    }
  }
  return out;
}

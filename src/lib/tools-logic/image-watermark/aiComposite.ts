import type { RGBAImage } from "./inpaint";
import type { PixelBBox } from "./maskOps";

/**
 * Blends an AI-inpainted crop back into the full image, mutating `image` in
 * place. `resultRGB` and `weightMask` must both already be at the crop's
 * native size (i.e. resized back down from the model's fixed resolution).
 * Blending by the same feathered weight used to build the model's mask
 * keeps the seam at the crop boundary invisible — pixels near the edge of
 * the hole fade smoothly from original to repaired instead of cutting hard.
 */
export function compositeCropIntoImage(
  image: RGBAImage,
  cropRect: PixelBBox,
  resultRGB: Uint8ClampedArray,
  weightMask: Uint8ClampedArray,
): void {
  const { x: cx, y: cy, width: cw, height: ch } = cropRect;

  for (let y = 0; y < ch; y++) {
    const imageY = cy + y;
    if (imageY < 0 || imageY >= image.height) continue;
    for (let x = 0; x < cw; x++) {
      const imageX = cx + x;
      if (imageX < 0 || imageX >= image.width) continue;

      const weight = (weightMask[y * cw + x] ?? 0) / 255;
      if (weight <= 0) continue;

      const destIdx = (imageY * image.width + imageX) * 4;
      const srcIdx = (y * cw + x) * 3;
      const origR = image.data[destIdx] ?? 0;
      const origG = image.data[destIdx + 1] ?? 0;
      const origB = image.data[destIdx + 2] ?? 0;
      const filledR = resultRGB[srcIdx] ?? 0;
      const filledG = resultRGB[srcIdx + 1] ?? 0;
      const filledB = resultRGB[srcIdx + 2] ?? 0;

      image.data[destIdx] = origR * (1 - weight) + filledR * weight;
      image.data[destIdx + 1] = origG * (1 - weight) + filledG * weight;
      image.data[destIdx + 2] = origB * (1 - weight) + filledB * weight;
      // alpha is left untouched -- inpainting only ever changes color content
    }
  }
}

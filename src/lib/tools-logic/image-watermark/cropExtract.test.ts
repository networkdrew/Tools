import { describe, expect, it } from "vitest";
import { extractCropMask, extractCropRGB } from "./cropExtract";
import type { RGBAImage } from "./inpaint";
import type { RasterizedMask } from "./maskOps";

function makeImage(width: number, height: number): RGBAImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      data[i] = x;
      data[i + 1] = y;
      data[i + 2] = 100;
      data[i + 3] = 255;
    }
  }
  return { data, width, height };
}

describe("extractCropRGB", () => {
  it("extracts the correct sub-region, dropping alpha", () => {
    const image = makeImage(10, 10);
    const crop = extractCropRGB(image, { x: 2, y: 3, width: 4, height: 4 });
    expect(crop.length).toBe(4 * 4 * 3);
    // pixel (0,0) of the crop corresponds to image (2,3)
    expect(crop[0]).toBe(2);
    expect(crop[1]).toBe(3);
    expect(crop[2]).toBe(100);
  });

  it("zero-pads the portion of the crop that falls outside the image", () => {
    const image = makeImage(5, 5);
    const crop = extractCropRGB(image, { x: 3, y: 3, width: 4, height: 4 });
    // bottom-right corner of the crop is entirely outside the 5x5 image
    const lastPixelIdx = (3 * 4 + 3) * 3;
    expect(crop[lastPixelIdx]).toBe(0);
    expect(crop[lastPixelIdx + 1]).toBe(0);
  });
});

describe("extractCropMask", () => {
  it("places the bbox-local mask correctly within a larger crop", () => {
    const mask: RasterizedMask = {
      mask: new Uint8ClampedArray([255, 255, 255, 255]),
      bbox: { x: 10, y: 10, width: 2, height: 2 },
    };
    const cropRect = { x: 5, y: 5, width: 10, height: 10 };
    const cropMask = extractCropMask(mask, cropRect);
    // mask bbox (10,10) maps to crop-local (5,5)
    expect(cropMask[5 * 10 + 5]).toBe(255);
    expect(cropMask[5 * 10 + 6]).toBe(255);
    // outside the mask's own bbox should be 0
    expect(cropMask[0]).toBe(0);
  });

  it("returns an all-zero mask when the crop doesn't overlap the mask's bbox at all", () => {
    const mask: RasterizedMask = {
      mask: new Uint8ClampedArray([255]),
      bbox: { x: 0, y: 0, width: 1, height: 1 },
    };
    const cropRect = { x: 50, y: 50, width: 10, height: 10 };
    const cropMask = extractCropMask(mask, cropRect);
    expect(cropMask.every((v) => v === 0)).toBe(true);
  });
});

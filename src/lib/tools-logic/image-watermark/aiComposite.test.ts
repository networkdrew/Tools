import { describe, expect, it } from "vitest";
import { compositeCropIntoImage } from "./aiComposite";
import type { RGBAImage } from "./inpaint";

function solidImage(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
): RGBAImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return { data, width, height };
}

describe("compositeCropIntoImage", () => {
  it("fully replaces pixels where weight is 255", () => {
    const image = solidImage(4, 4, 10, 10, 10);
    const cropRect = { x: 1, y: 1, width: 2, height: 2 };
    const resultRGB = new Uint8ClampedArray([
      200, 0, 0, 200, 0, 0, 200, 0, 0, 200, 0, 0,
    ]);
    const weightMask = new Uint8ClampedArray([255, 255, 255, 255]);
    compositeCropIntoImage(image, cropRect, resultRGB, weightMask);
    const idx = (1 * 4 + 1) * 4;
    expect(image.data[idx]).toBe(200);
    expect(image.data[idx + 1]).toBe(0);
  });

  it("leaves pixels untouched where weight is 0", () => {
    const image = solidImage(4, 4, 10, 20, 30);
    const cropRect = { x: 0, y: 0, width: 2, height: 2 };
    const resultRGB = new Uint8ClampedArray([
      255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255, 255,
    ]);
    const weightMask = new Uint8ClampedArray([0, 0, 0, 0]);
    compositeCropIntoImage(image, cropRect, resultRGB, weightMask);
    expect(image.data[0]).toBe(10);
    expect(image.data[1]).toBe(20);
    expect(image.data[2]).toBe(30);
  });

  it("blends proportionally for partial weight (feathered edge)", () => {
    const image = solidImage(2, 1, 0, 0, 0);
    const cropRect = { x: 0, y: 0, width: 2, height: 1 };
    const resultRGB = new Uint8ClampedArray([200, 200, 200, 200, 200, 200]);
    const weightMask = new Uint8ClampedArray([128, 255]);
    compositeCropIntoImage(image, cropRect, resultRGB, weightMask);
    expect(image.data[0]).toBeCloseTo(100, -1);
    expect(image.data[4]).toBe(200);
  });

  it("does not modify alpha", () => {
    const image = solidImage(2, 2, 5, 5, 5);
    image.data[3] = 128; // pixel 0 alpha
    const cropRect = { x: 0, y: 0, width: 2, height: 2 };
    const resultRGB = new Uint8ClampedArray(12).fill(255);
    const weightMask = new Uint8ClampedArray(4).fill(255);
    compositeCropIntoImage(image, cropRect, resultRGB, weightMask);
    expect(image.data[3]).toBe(128);
  });

  it("clips a crop that partially extends outside the image bounds", () => {
    const image = solidImage(3, 3, 1, 1, 1);
    const cropRect = { x: 2, y: 2, width: 3, height: 3 };
    const resultRGB = new Uint8ClampedArray(27).fill(200);
    const weightMask = new Uint8ClampedArray(9).fill(255);
    expect(() =>
      compositeCropIntoImage(image, cropRect, resultRGB, weightMask),
    ).not.toThrow();
    const idx = (2 * 3 + 2) * 4;
    expect(image.data[idx]).toBe(200);
  });
});

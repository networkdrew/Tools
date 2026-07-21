import { describe, expect, it } from "vitest";
import { buildLamaTensors, decodeLamaOutput } from "./lamaTensor";

describe("buildLamaTensors", () => {
  it("normalizes known (non-hole) pixels to 0..1 and marks their mask value as 0", () => {
    const size = 2;
    const rgb = new Uint8ClampedArray([
      255,
      0,
      0, // pixel 0
      0,
      255,
      0, // pixel 1
      0,
      0,
      255, // pixel 2
      255,
      255,
      255, // pixel 3
    ]);
    const maskWeight = new Uint8ClampedArray([0, 0, 0, 0]); // nothing masked
    const { image, mask } = buildLamaTensors(rgb, maskWeight, size);
    expect(mask.every((v) => v === 0)).toBe(true);
    // NCHW: plane 0 = R channel across all pixels
    expect(image[0]).toBeCloseTo(1, 5); // pixel0 R = 255/255
    expect(image[5]).toBeCloseTo(1, 5); // pixel1 G = 255/255 (G plane starts at index size*size=4)
  });

  it("pre-blanks the image to 0 and sets mask=1 at hole pixels", () => {
    const size = 2;
    const rgb = new Uint8ClampedArray([
      200, 150, 100, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    ]);
    const maskWeight = new Uint8ClampedArray([255, 0, 0, 0]); // pixel 0 is a hole
    const { image, mask } = buildLamaTensors(rgb, maskWeight, size);
    expect(mask[0]).toBe(1);
    expect(mask[1]).toBe(0);
    const plane = size * size;
    expect(image[0]).toBe(0); // R at hole pixel, blanked
    expect(image[plane]).toBe(0); // G at hole pixel, blanked
    expect(image[2 * plane]).toBe(0); // B at hole pixel, blanked
  });

  it("respects a custom hole threshold", () => {
    const size = 1;
    const rgb = new Uint8ClampedArray([10, 20, 30]);
    const lowWeight = new Uint8ClampedArray([100]);
    const { mask: maskLow } = buildLamaTensors(rgb, lowWeight, size, 50);
    expect(maskLow[0]).toBe(1);
    const { mask: maskHigh } = buildLamaTensors(rgb, lowWeight, size, 150);
    expect(maskHigh[0]).toBe(0);
  });
});

describe("decodeLamaOutput", () => {
  it("converts NCHW planar float output directly to interleaved RGB without rescaling", () => {
    const size = 2;
    const plane = size * size;
    const output = new Float32Array(3 * plane);
    for (let i = 0; i < plane; i++) {
      output[i] = 10 + i; // R plane
      output[plane + i] = 100 + i; // G plane
      output[2 * plane + i] = 200 + i; // B plane
    }
    const rgb = decodeLamaOutput(output, size);
    expect(rgb[0]).toBe(10);
    expect(rgb[1]).toBe(100);
    expect(rgb[2]).toBe(200);
    expect(rgb[3]).toBe(11);
  });

  it("clamps out-of-range values into 0..255", () => {
    const size = 1;
    const output = new Float32Array([-10, 300, 128]);
    const rgb = decodeLamaOutput(output, size);
    expect(rgb[0]).toBe(0);
    expect(rgb[1]).toBe(255);
    expect(rgb[2]).toBe(128);
  });
});

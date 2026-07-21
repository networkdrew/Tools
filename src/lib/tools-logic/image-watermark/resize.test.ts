import { describe, expect, it } from "vitest";
import { resizeMask, resizeRGB } from "./resize";

describe("resizeRGB", () => {
  it("preserves a uniform color when resizing", () => {
    const w = 4,
      h = 4;
    const data = new Uint8ClampedArray(w * h * 3);
    for (let i = 0; i < w * h; i++) {
      data[i * 3] = 200;
      data[i * 3 + 1] = 100;
      data[i * 3 + 2] = 50;
    }
    const resized = resizeRGB(data, w, h, 8, 8);
    expect(resized.length).toBe(8 * 8 * 3);
    for (let i = 0; i < 8 * 8; i++) {
      expect(resized[i * 3]).toBeCloseTo(200, 0);
      expect(resized[i * 3 + 1]).toBeCloseTo(100, 0);
      expect(resized[i * 3 + 2]).toBeCloseTo(50, 0);
    }
  });

  it("interpolates smoothly across a gradient rather than nearest-neighbor jumping", () => {
    const w = 2,
      h = 1;
    const data = new Uint8ClampedArray([0, 0, 0, 200, 200, 200]);
    const resized = resizeRGB(data, w, h, 4, 1);
    const values = [0, 1, 2, 3].map((x) => resized[x * 3] as number);
    // should be a monotonic ramp, not a hard 0/200 step
    for (let i = 1; i < values.length; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1] as number);
    }
    expect(values[0]).toBeLessThan(100);
    expect(values[3]).toBeGreaterThan(100);
  });

  it("round-trips a downscale/upscale close to the original for a smooth gradient", () => {
    const w = 100,
      h = 1;
    const data = new Uint8ClampedArray(w * 3);
    for (let x = 0; x < w; x++) {
      const v = Math.round((x / (w - 1)) * 255);
      data[x * 3] = v;
      data[x * 3 + 1] = v;
      data[x * 3 + 2] = v;
    }
    const down = resizeRGB(data, w, h, 20, 1);
    const up = resizeRGB(down, 20, 1, w, h);
    expect(Math.abs((up[0] as number) - (data[0] as number))).toBeLessThan(30);
    const lastIdx = (w - 1) * 3;
    expect(
      Math.abs((up[lastIdx] as number) - (data[lastIdx] as number)),
    ).toBeLessThan(30);
  });

  it("handles a 1x1 source", () => {
    const resized = resizeRGB(new Uint8ClampedArray([10, 20, 30]), 1, 1, 3, 3);
    expect(resized.length).toBe(27);
    expect(resized[0]).toBe(10);
  });
});

describe("resizeMask", () => {
  it("resizes a single-channel buffer", () => {
    const data = new Uint8ClampedArray([0, 255, 0, 255]); // 2x2 checkerboard-ish
    const resized = resizeMask(data, 2, 2, 4, 4);
    expect(resized.length).toBe(16);
  });

  it("preserves a fully-opaque mask", () => {
    const data = new Uint8ClampedArray(9).fill(255);
    const resized = resizeMask(data, 3, 3, 6, 6);
    for (const v of resized) expect(v).toBe(255);
  });
});

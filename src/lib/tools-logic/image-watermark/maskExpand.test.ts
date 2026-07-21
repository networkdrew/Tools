import { describe, expect, it } from "vitest";
import { clampExpandRadius, dilateMask } from "./maskExpand";

describe("dilateMask", () => {
  it("grows an isolated hot pixel into a filled square of the given radius", () => {
    const w = 11,
      h = 11;
    const mask = new Uint8ClampedArray(w * h);
    mask[5 * w + 5] = 255; // center
    dilateMask(mask, w, h, 2);
    // center and immediate neighborhood within radius 2 should now be 255
    expect(mask[5 * w + 5]).toBe(255);
    expect(mask[5 * w + 7]).toBe(255); // 2px to the right
    expect(mask[5 * w + 3]).toBe(255); // 2px to the left
    expect(mask[3 * w + 5]).toBe(255); // 2px up
    expect(mask[5 * w + 8]).toBe(0); // 3px away, outside radius
  });

  it("is a no-op for radius 0", () => {
    const w = 5,
      h = 5;
    const mask = new Uint8ClampedArray(w * h);
    mask[12] = 200;
    const before = Uint8ClampedArray.from(mask);
    dilateMask(mask, w, h, 0);
    expect(mask).toEqual(before);
  });

  it("never shrinks the masked region", () => {
    const w = 10,
      h = 10;
    const mask = new Uint8ClampedArray(w * h);
    for (let y = 3; y < 7; y++)
      for (let x = 3; x < 7; x++) mask[y * w + x] = 255;
    const before = Uint8ClampedArray.from(mask);
    dilateMask(mask, w, h, 1);
    for (let i = 0; i < mask.length; i++) {
      if (before[i] === 255) expect(mask[i]).toBe(255);
    }
  });

  it("propagates the maximum weight, not just binary presence", () => {
    const w = 5,
      h = 1;
    const mask = new Uint8ClampedArray([0, 0, 120, 0, 0]);
    dilateMask(mask, w, h, 1);
    expect(mask[1]).toBe(120);
    expect(mask[3]).toBe(120);
  });
});

describe("clampExpandRadius", () => {
  it("clamps to the documented 0..64 range", () => {
    expect(clampExpandRadius(-5)).toBe(0);
    expect(clampExpandRadius(1000)).toBe(64);
    expect(clampExpandRadius(10)).toBe(10);
  });
});

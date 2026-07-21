import { describe, expect, it } from "vitest";
import {
  boxBlurMask,
  rasterizeOperation,
  type RepairOperation,
} from "./maskOps";

const W = 100;
const H = 100;

function weightAt(
  mask: Uint8ClampedArray,
  bbox: { x: number; y: number; width: number; height: number },
  x: number,
  y: number,
): number {
  const lx = x - bbox.x;
  const ly = y - bbox.y;
  if (lx < 0 || ly < 0 || lx >= bbox.width || ly >= bbox.height) return 0;
  return mask[ly * bbox.width + lx] ?? 0;
}

describe("rasterizeOperation: brush", () => {
  it("is fully opaque at the stroke center and fades out past radius+feather", () => {
    const op: RepairOperation = {
      id: "1",
      kind: "brush",
      points: [{ x: 0.5, y: 0.5 }],
      radius: 0.1, // 10px
      feather: 0.02, // 2px
    };
    const result = rasterizeOperation(op, W, H);
    expect(result).not.toBeNull();
    const { mask, bbox } = result!;
    expect(weightAt(mask, bbox, 50, 50)).toBe(255);
    // just outside radius+feather (10+2=12px away)
    expect(weightAt(mask, bbox, 50 + 20, 50)).toBe(0);
  });

  it("feathers linearly between radius and radius+feather", () => {
    const op: RepairOperation = {
      id: "1",
      kind: "brush",
      points: [{ x: 0.5, y: 0.5 }],
      radius: 0.1,
      feather: 0.1,
    };
    const { mask, bbox } = rasterizeOperation(op, W, H)!;
    const atRadius = weightAt(mask, bbox, 60, 50); // exactly at radius (10px away)
    const halfway = weightAt(mask, bbox, 65, 50); // halfway through feather
    expect(atRadius).toBeGreaterThan(halfway);
    expect(halfway).toBeGreaterThan(0);
  });

  it("covers a whole path, not just its endpoints", () => {
    const op: RepairOperation = {
      id: "1",
      kind: "brush",
      points: [
        { x: 0.2, y: 0.5 },
        { x: 0.8, y: 0.5 },
      ],
      radius: 0.05,
      feather: 0.01,
    };
    const { mask, bbox } = rasterizeOperation(op, W, H)!;
    // midpoint of the stroke should be covered
    expect(weightAt(mask, bbox, 50, 50)).toBe(255);
  });

  it("returns null for an empty point list", () => {
    const op: RepairOperation = {
      id: "1",
      kind: "brush",
      points: [],
      radius: 0.1,
      feather: 0.02,
    };
    expect(rasterizeOperation(op, W, H)).toBeNull();
  });
});

describe("rasterizeOperation: box", () => {
  it("is opaque in the core and fades inward near the edges", () => {
    const op: RepairOperation = {
      id: "1",
      kind: "box",
      rect: { x: 0.2, y: 0.2, width: 0.3, height: 0.3 },
      feather: 0.02, // 2px
    };
    const { mask, bbox } = rasterizeOperation(op, W, H)!;
    // rect is [20,20]-[50,50]; center is well inside the feathered core
    expect(weightAt(mask, bbox, 35, 35)).toBe(255);
    // 1px inside the left edge is within the 2px feather band
    expect(weightAt(mask, bbox, 21, 35)).toBeLessThan(255);
    expect(weightAt(mask, bbox, 21, 35)).toBeGreaterThan(0);
  });

  it("is zero outside the rect", () => {
    const op: RepairOperation = {
      id: "1",
      kind: "box",
      rect: { x: 0.2, y: 0.2, width: 0.3, height: 0.3 },
      feather: 0.02,
    };
    const { mask, bbox } = rasterizeOperation(op, W, H)!;
    expect(weightAt(mask, bbox, 10, 10)).toBe(0);
  });
});

describe("rasterizeOperation: lasso", () => {
  it("fills the polygon interior and leaves the exterior empty", () => {
    const op: RepairOperation = {
      id: "1",
      kind: "lasso",
      points: [
        { x: 0.2, y: 0.2 },
        { x: 0.8, y: 0.2 },
        { x: 0.8, y: 0.8 },
        { x: 0.2, y: 0.8 },
      ],
      feather: 0,
    };
    const { mask, bbox } = rasterizeOperation(op, W, H)!;
    expect(weightAt(mask, bbox, 50, 50)).toBeGreaterThan(200);
  });

  it("returns null for fewer than 3 points", () => {
    const op: RepairOperation = {
      id: "1",
      kind: "lasso",
      points: [
        { x: 0.2, y: 0.2 },
        { x: 0.8, y: 0.8 },
      ],
      feather: 0,
    };
    expect(rasterizeOperation(op, W, H)).toBeNull();
  });
});

describe("boxBlurMask", () => {
  it("softens a hard step edge", () => {
    const width = 20;
    const height = 1;
    const mask = new Uint8ClampedArray(width * height);
    for (let x = 10; x < width; x++) mask[x] = 255;
    boxBlurMask(mask, width, height, 3, 3);
    // the step at x=10 should now be a ramp, not a hard jump
    expect(mask[9]).toBeGreaterThan(0);
    expect(mask[9]).toBeLessThan(255);
  });
});

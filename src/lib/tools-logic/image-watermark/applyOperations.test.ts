import { describe, expect, it } from "vitest";
import { applyRepairOperations } from "./applyOperations";
import type { RGBAImage } from "./inpaint";
import type { RepairOperation } from "./maskOps";

function solidImage(width: number, height: number, value: number): RGBAImage {
  const data = new Uint8ClampedArray(width * height * 4).fill(value);
  for (let i = 3; i < data.length; i += 4) data[i] = 255;
  return { data, width, height };
}

describe("applyRepairOperations", () => {
  it("returns an unmodified copy for an empty operation list", () => {
    const base = solidImage(10, 10, 50);
    const result = applyRepairOperations(base, []);
    expect(result.data).toEqual(base.data);
    expect(result.data).not.toBe(base.data);
  });

  it("does not mutate the base image", () => {
    const base = solidImage(10, 10, 50);
    const originalCopy = new Uint8ClampedArray(base.data);
    const ops: RepairOperation[] = [
      {
        id: "1",
        kind: "brush",
        points: [{ x: 0.5, y: 0.5 }],
        radius: 0.2,
        feather: 0.05,
      },
    ];
    applyRepairOperations(base, ops);
    expect(base.data).toEqual(originalCopy);
  });

  it("applies operations in order", () => {
    const width = 20;
    const height = 20;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const isLeft = x < width / 2;
        data[i] = isLeft ? 0 : 255; // R
        data[i + 3] = 255;
      }
    }
    const base: RGBAImage = { data, width, height };

    const ops: RepairOperation[] = [
      {
        id: "clone",
        kind: "clone",
        points: [{ x: 0.75, y: 0.5 }],
        radius: 0.2,
        feather: 0.02,
        sourceOffset: { x: -0.5, y: 0 },
      },
    ];
    const result = applyRepairOperations(base, ops);
    const idx = (10 * width + 15) * 4;
    expect(result.data[idx]).toBeLessThan(base.data[idx] as number);
  });

  it("skips operations that rasterize to nothing (e.g. empty brush)", () => {
    const base = solidImage(10, 10, 50);
    const ops: RepairOperation[] = [
      { id: "1", kind: "brush", points: [], radius: 0.1, feather: 0.02 },
    ];
    expect(() => applyRepairOperations(base, ops)).not.toThrow();
  });
});

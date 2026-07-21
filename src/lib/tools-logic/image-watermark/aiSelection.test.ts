import { describe, expect, it } from "vitest";
import {
  rasterizeSelectionPreview,
  resolveAddInstances,
  subtractMask,
  type PendingStroke,
} from "./aiSelection";
import {
  rasterizeOperation,
  type BrushOperation,
  type RepairOperation,
} from "./maskOps";

const W = 100;
const H = 100;

function brush(
  id: string,
  x: number,
  y: number,
  radius = 0.1,
  feather = 0.01,
): BrushOperation {
  return { id, kind: "brush", points: [{ x, y }], radius, feather };
}

describe("subtractMask", () => {
  it("zeroes the overlapping region and leaves the rest untouched", () => {
    const target = rasterizeOperation(brush("a", 0.5, 0.5, 0.2, 0), W, H)!;
    const eraser = rasterizeOperation(brush("b", 0.5, 0.5, 0.2, 0), W, H)!;
    const result = subtractMask(target, eraser);
    for (const v of result.mask) expect(v).toBe(0);
  });

  it("does not affect the mask when the eraser doesn't overlap", () => {
    const target = rasterizeOperation(brush("a", 0.2, 0.2, 0.05, 0), W, H)!;
    const eraser = rasterizeOperation(brush("b", 0.9, 0.9, 0.05, 0), W, H)!;
    const result = subtractMask(target, eraser);
    expect(result.mask).toEqual(target.mask);
  });

  it("does not mutate its inputs", () => {
    const target = rasterizeOperation(brush("a", 0.5, 0.5, 0.2, 0), W, H)!;
    const targetCopy = Uint8ClampedArray.from(target.mask);
    const eraser = rasterizeOperation(brush("b", 0.5, 0.5, 0.1, 0), W, H)!;
    subtractMask(target, eraser);
    expect(target.mask).toEqual(targetCopy);
  });
});

describe("resolveAddInstances", () => {
  it("returns one instance per add stroke", () => {
    const strokes: PendingStroke[] = [
      { id: "1", kind: "add", op: brush("1", 0.2, 0.2) },
      { id: "2", kind: "add", op: brush("2", 0.8, 0.8) },
    ];
    const instances = resolveAddInstances(strokes, W, H);
    expect(instances).toHaveLength(2);
  });

  it("ignores erase-only selections (nothing to remove)", () => {
    const strokes: PendingStroke[] = [
      { id: "1", kind: "erase", op: brush("1", 0.5, 0.5) },
    ];
    expect(resolveAddInstances(strokes, W, H)).toHaveLength(0);
  });

  it("subtracts an erase stroke from an overlapping add instance", () => {
    const strokes: PendingStroke[] = [
      { id: "1", kind: "add", op: brush("1", 0.5, 0.5, 0.2, 0) },
      { id: "2", kind: "erase", op: brush("2", 0.5, 0.5, 0.2, 0) },
    ];
    expect(resolveAddInstances(strokes, W, H)).toHaveLength(0);
  });

  it("drops instances that erase completely removed, keeping unaffected ones", () => {
    const strokes: PendingStroke[] = [
      { id: "1", kind: "add", op: brush("1", 0.2, 0.2, 0.05, 0) },
      { id: "2", kind: "add", op: brush("2", 0.8, 0.8, 0.05, 0) },
      { id: "3", kind: "erase", op: brush("3", 0.2, 0.2, 0.1, 0) },
    ];
    const instances = resolveAddInstances(strokes, W, H);
    expect(instances).toHaveLength(1);
  });

  it("skips add strokes that fail to rasterize (e.g. empty points)", () => {
    const empty: RepairOperation = {
      id: "x",
      kind: "brush",
      points: [],
      radius: 0.1,
      feather: 0,
    };
    const strokes: PendingStroke[] = [{ id: "1", kind: "add", op: empty }];
    expect(resolveAddInstances(strokes, W, H)).toHaveLength(0);
  });
});

describe("rasterizeSelectionPreview", () => {
  it("returns null when there's no selection", () => {
    expect(rasterizeSelectionPreview([], W, H)).toBeNull();
  });

  it("covers the union bbox of scattered add strokes", () => {
    const strokes: PendingStroke[] = [
      { id: "1", kind: "add", op: brush("1", 0.1, 0.1, 0.03, 0) },
      { id: "2", kind: "add", op: brush("2", 0.9, 0.9, 0.03, 0) },
    ];
    const preview = rasterizeSelectionPreview(strokes, W, H);
    expect(preview).not.toBeNull();
    expect(preview!.bbox.width).toBeGreaterThan(50);
    expect(preview!.bbox.height).toBeGreaterThan(50);
  });
});

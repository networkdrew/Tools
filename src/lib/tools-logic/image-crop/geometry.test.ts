import { describe, expect, it } from "vitest";
import {
  applyHandleDrag,
  clampRectToBounds,
  computePreviewSize,
  initialCropRect,
  moveRect,
  normalizeRotation,
  orientedSize,
  rectAspect,
  rotateClockwise,
  rotateCounterClockwise,
  scaleRect,
} from "./geometry";

describe("orientedSize", () => {
  it("keeps dimensions unchanged at 0 and 180 degrees", () => {
    expect(orientedSize({ width: 800, height: 600 }, 0)).toEqual({
      width: 800,
      height: 600,
    });
    expect(orientedSize({ width: 800, height: 600 }, 180)).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("swaps dimensions at 90 and 270 degrees", () => {
    expect(orientedSize({ width: 800, height: 600 }, 90)).toEqual({
      width: 600,
      height: 800,
    });
    expect(orientedSize({ width: 800, height: 600 }, 270)).toEqual({
      width: 600,
      height: 800,
    });
  });
});

describe("normalizeRotation / rotateClockwise / rotateCounterClockwise", () => {
  it("wraps negative and over-360 values into 0-270", () => {
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(360)).toBe(0);
    expect(normalizeRotation(450)).toBe(90);
  });

  it("steps clockwise and counter-clockwise by 90 and wraps", () => {
    expect(rotateClockwise(270)).toBe(0);
    expect(rotateClockwise(90)).toBe(180);
    expect(rotateCounterClockwise(0)).toBe(270);
    expect(rotateCounterClockwise(180)).toBe(90);
  });
});

describe("clampRectToBounds", () => {
  it("leaves a rect already inside bounds unchanged", () => {
    const rect = { x: 10, y: 10, width: 100, height: 50 };
    expect(clampRectToBounds(rect, { width: 200, height: 200 })).toEqual(rect);
  });

  it("shrinks a rect larger than bounds", () => {
    const rect = { x: 0, y: 0, width: 300, height: 300 };
    expect(clampRectToBounds(rect, { width: 200, height: 100 })).toEqual({
      x: 0,
      y: 0,
      width: 200,
      height: 100,
    });
  });

  it("pulls an out-of-bounds position back inside", () => {
    const rect = { x: 190, y: 190, width: 50, height: 50 };
    expect(clampRectToBounds(rect, { width: 200, height: 200 })).toEqual({
      x: 150,
      y: 150,
      width: 50,
      height: 50,
    });
  });

  it("never returns a zero-sized crop for a non-empty bounds", () => {
    const rect = { x: 0, y: 0, width: 0, height: 0 };
    const result = clampRectToBounds(rect, { width: 200, height: 200 });
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });
});

describe("initialCropRect", () => {
  it("returns the full bounds for a null (freeform) aspect", () => {
    expect(initialCropRect({ width: 400, height: 300 }, null)).toEqual({
      x: 0,
      y: 0,
      width: 400,
      height: 300,
    });
  });

  it("centers a square crop within a wide image", () => {
    const rect = initialCropRect({ width: 400, height: 200 }, 1);
    expect(rect).toEqual({ x: 100, y: 0, width: 200, height: 200 });
  });

  it("centers a square crop within a tall image", () => {
    const rect = initialCropRect({ width: 200, height: 400 }, 1);
    expect(rect).toEqual({ x: 0, y: 100, width: 200, height: 200 });
  });

  it("fits a 16:9 crop within bounds narrower than the ratio", () => {
    const rect = initialCropRect({ width: 400, height: 400 }, 16 / 9);
    expect(rect.width).toBeCloseTo(400);
    expect(rect.height).toBeCloseTo(225);
    expect(rect.y).toBeCloseTo(87.5);
  });
});

describe("moveRect", () => {
  it("translates the rect by the given delta", () => {
    const rect = { x: 10, y: 10, width: 50, height: 50 };
    expect(moveRect(rect, 20, 5, { width: 200, height: 200 })).toEqual({
      x: 30,
      y: 15,
      width: 50,
      height: 50,
    });
  });

  it("clamps movement so the rect stays fully inside the bounds", () => {
    const rect = { x: 10, y: 10, width: 50, height: 50 };
    expect(moveRect(rect, 1000, 1000, { width: 200, height: 200 })).toEqual({
      x: 150,
      y: 150,
      width: 50,
      height: 50,
    });
    expect(moveRect(rect, -1000, -1000, { width: 200, height: 200 })).toEqual({
      x: 0,
      y: 0,
      width: 50,
      height: 50,
    });
  });
});

describe("scaleRect", () => {
  it("multiplies every field by the factor (preview -> source translation)", () => {
    const rect = { x: 10, y: 20, width: 100, height: 50 };
    expect(scaleRect(rect, 2)).toEqual({
      x: 20,
      y: 40,
      width: 200,
      height: 100,
    });
    expect(scaleRect(rect, 0.5)).toEqual({
      x: 5,
      y: 10,
      width: 50,
      height: 25,
    });
  });
});

describe("rectAspect", () => {
  it("computes width/height", () => {
    expect(rectAspect({ x: 0, y: 0, width: 200, height: 100 })).toBe(2);
  });

  it("returns 0 for a zero-height rect instead of throwing or returning Infinity", () => {
    expect(rectAspect({ x: 0, y: 0, width: 200, height: 0 })).toBe(0);
  });
});

describe("applyHandleDrag", () => {
  const bounds = { width: 400, height: 400 };
  const rect = { x: 100, y: 100, width: 200, height: 200 };

  it("resizes freely from the se corner, anchoring the opposite (nw) corner", () => {
    const result = applyHandleDrag(rect, "se", 50, 30, bounds);
    expect(result).toEqual({ x: 100, y: 100, width: 250, height: 230 });
  });

  it("resizes freely from the nw corner, anchoring the opposite (se) corner", () => {
    const result = applyHandleDrag(rect, "nw", -50, -30, bounds);
    expect(result).toEqual({ x: 50, y: 70, width: 250, height: 230 });
  });

  it("resizes only width from the e edge handle, leaving y/height untouched", () => {
    const result = applyHandleDrag(rect, "e", 40, 999, bounds);
    expect(result).toEqual({ x: 100, y: 100, width: 240, height: 200 });
  });

  it("resizes only height from the n edge handle, leaving x/width untouched", () => {
    const result = applyHandleDrag(rect, "n", 999, -40, bounds);
    expect(result).toEqual({ x: 100, y: 60, width: 200, height: 240 });
  });

  it("never shrinks below the minimum size", () => {
    const result = applyHandleDrag(rect, "se", -1000, -1000, bounds, {
      minSize: 20,
    });
    expect(result.width).toBe(20);
    expect(result.height).toBe(20);
  });

  it("clamps growth to the image bounds", () => {
    const result = applyHandleDrag(rect, "se", 10000, 10000, bounds);
    expect(result.x + result.width).toBeLessThanOrEqual(bounds.width);
    expect(result.y + result.height).toBeLessThanOrEqual(bounds.height);
  });

  it("keeps a locked aspect ratio when dragging a corner handle", () => {
    const result = applyHandleDrag(rect, "se", 100, 20, bounds, {
      aspect: 1,
    });
    expect(result.width).toBe(result.height);
    // se anchors the opposite (nw) corner, so x/y stay fixed.
    expect(result.x).toBe(100);
    expect(result.y).toBe(100);
  });

  it("keeps a locked aspect ratio when dragging an edge handle, growing symmetrically about the center", () => {
    const centerYBefore = rect.y + rect.height / 2;
    const result = applyHandleDrag(rect, "e", 100, 0, bounds, { aspect: 1 });
    expect(result.width).toBeCloseTo(result.height);
    const centerYAfter = result.y + result.height / 2;
    expect(centerYAfter).toBeCloseTo(centerYBefore);
  });

  it("moves without resizing when handle is not a recognized resize handle boundary combination (sanity: move is a separate function)", () => {
    // applyHandleDrag has no "move" handle id — moveRect covers that case.
    const result = applyHandleDrag(rect, "n", 0, 0, bounds);
    expect(result).toEqual(rect);
  });
});

describe("computePreviewSize", () => {
  it("leaves an image already within the max dimension unchanged", () => {
    expect(computePreviewSize({ width: 800, height: 600 }, 1200)).toEqual({
      width: 800,
      height: 600,
    });
  });

  it("downscales a larger image, preserving aspect ratio", () => {
    expect(computePreviewSize({ width: 4000, height: 2000 }, 1000)).toEqual({
      width: 1000,
      height: 500,
    });
  });

  it("never upscales a small image", () => {
    expect(computePreviewSize({ width: 100, height: 50 }, 1200)).toEqual({
      width: 100,
      height: 50,
    });
  });
});

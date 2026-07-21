import { describe, expect, it } from "vitest";
import {
  canvasToScreenPoint,
  clamp,
  clampZoom,
  computeFitZoom,
  mapLengthBetweenSizes,
  mapPointBetweenSizes,
  rotatePoint,
  rotatedBoundingSize,
  screenToCanvasPoint,
  toNormalized,
  toPixels,
} from "./geometry";

describe("clamp", () => {
  it("clamps within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe("normalized <-> pixel conversion", () => {
  it("round-trips a point through normalize/denormalize", () => {
    const size = { width: 800, height: 400 };
    const point = { x: 200, y: 100 };
    const normalized = toNormalized(point, size);
    expect(normalized).toEqual({ x: 0.25, y: 0.25 });
    expect(toPixels(normalized, size)).toEqual(point);
  });

  it("handles a degenerate zero-size canvas without NaN", () => {
    expect(toNormalized({ x: 5, y: 5 }, { width: 0, height: 0 })).toEqual({
      x: 0,
      y: 0,
    });
  });
});

describe("mapPointBetweenSizes", () => {
  it("scales a preview-space point to full-resolution export space", () => {
    const preview = { width: 400, height: 300 };
    const fullRes = { width: 4000, height: 3000 };
    const previewPoint = { x: 100, y: 60 };
    expect(mapPointBetweenSizes(previewPoint, preview, fullRes)).toEqual({
      x: 1000,
      y: 600,
    });
  });

  it("is the identity when both sizes match", () => {
    const size = { width: 640, height: 480 };
    const point = { x: 321, y: 12 };
    expect(mapPointBetweenSizes(point, size, size)).toEqual(point);
  });
});

describe("mapLengthBetweenSizes", () => {
  it("scales a length proportionally to width", () => {
    expect(mapLengthBetweenSizes(50, 500, 1000)).toBe(100);
  });
});

describe("viewport screen/canvas conversion", () => {
  it("converts a screen point to canvas space accounting for zoom and pan", () => {
    const containerOrigin = { x: 10, y: 20 };
    const zoom = 2;
    const pan = { x: 30, y: 40 };
    // screen point sits at container-local (130, 140) after removing origin
    const screenPoint = { x: 10 + 130, y: 20 + 140 };
    const canvasPoint = screenToCanvasPoint(
      screenPoint,
      containerOrigin,
      zoom,
      pan,
    );
    expect(canvasPoint).toEqual({ x: (130 - 30) / 2, y: (140 - 40) / 2 });
  });

  it("round-trips screen -> canvas -> screen", () => {
    const containerOrigin = { x: 5, y: 5 };
    const zoom = 1.5;
    const pan = { x: -20, y: 10 };
    const original = { x: 120, y: 90 };
    const canvasPoint = screenToCanvasPoint(
      original,
      containerOrigin,
      zoom,
      pan,
    );
    const back = canvasToScreenPoint(canvasPoint, containerOrigin, zoom, pan);
    expect(back.x).toBeCloseTo(original.x);
    expect(back.y).toBeCloseTo(original.y);
  });

  it("falls back to zoom=1 semantics when zoom is zero or negative", () => {
    const point = screenToCanvasPoint({ x: 50, y: 50 }, { x: 0, y: 0 }, 0, {
      x: 0,
      y: 0,
    });
    expect(point).toEqual({ x: 50, y: 50 });
  });
});

describe("computeFitZoom", () => {
  it("shrinks content to fit inside a smaller container", () => {
    const zoom = computeFitZoom(
      { width: 2000, height: 1000 },
      { width: 400, height: 400 },
    );
    expect(zoom).toBeCloseTo(0.2);
  });

  it("never enlarges past 100%", () => {
    const zoom = computeFitZoom(
      { width: 100, height: 100 },
      { width: 800, height: 800 },
    );
    expect(zoom).toBe(1);
  });
});

describe("clampZoom", () => {
  it("keeps zoom within the min/max bounds", () => {
    expect(clampZoom(0)).toBeGreaterThan(0);
    expect(clampZoom(100)).toBeLessThanOrEqual(4);
  });
});

describe("rotatePoint", () => {
  it("rotates a point 90 degrees around a center", () => {
    const result = rotatePoint({ x: 10, y: 0 }, { x: 0, y: 0 }, 90);
    expect(result.x).toBeCloseTo(0);
    expect(result.y).toBeCloseTo(10);
  });

  it("leaves the center point unchanged", () => {
    expect(rotatePoint({ x: 5, y: 5 }, { x: 5, y: 5 }, 45)).toEqual({
      x: 5,
      y: 5,
    });
  });
});

describe("rotatedBoundingSize", () => {
  it("returns the same size for a 0 degree rotation", () => {
    const size = rotatedBoundingSize(100, 40, 0);
    expect(size.width).toBeCloseTo(100);
    expect(size.height).toBeCloseTo(40);
  });

  it("swaps width/height for a 90 degree rotation", () => {
    const size = rotatedBoundingSize(100, 40, 90);
    expect(size.width).toBeCloseTo(40);
    expect(size.height).toBeCloseTo(100);
  });
});

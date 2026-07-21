import { describe, expect, it } from "vitest";
import {
  computeRepeatingPlacements,
  computeSingleCenter,
  isRepeatingPreset,
  resolvePlacements,
  type WatermarkLayoutSettings,
} from "./placements";

const canvasSize = { width: 1000, height: 500 };
const contentSize = { width: 100, height: 50 };

describe("isRepeatingPreset", () => {
  it("flags tiled and diagonal as repeating", () => {
    expect(isRepeatingPreset("tiled")).toBe(true);
    expect(isRepeatingPreset("diagonal")).toBe(true);
  });

  it("flags single-position presets as non-repeating", () => {
    expect(isRepeatingPreset("center")).toBe(false);
    expect(isRepeatingPreset("custom")).toBe(false);
  });
});

describe("computeSingleCenter", () => {
  it("centers exactly at 0.5/0.5 for the center preset", () => {
    expect(
      computeSingleCenter("center", canvasSize, contentSize, 0.02, {
        x: 0,
        y: 0,
      }),
    ).toEqual({
      x: 0.5,
      y: 0.5,
    });
  });

  it("uses the provided custom center, clamped to 0..1", () => {
    expect(
      computeSingleCenter("custom", canvasSize, contentSize, 0.02, {
        x: 1.5,
        y: -0.5,
      }),
    ).toEqual({ x: 1, y: 0 });
  });

  it("positions a corner inset by padding plus half the content size", () => {
    const paddingFraction = 0.02; // 2% of 1000px = 20px
    const center = computeSingleCenter(
      "top-left",
      canvasSize,
      contentSize,
      paddingFraction,
      {
        x: 0,
        y: 0,
      },
    );
    // padding(20) + halfWidth(50) = 70px -> /1000
    expect(center.x).toBeCloseTo(70 / 1000);
    // padding(20) + halfHeight(25) = 45px -> /500
    expect(center.y).toBeCloseTo(45 / 500);
  });

  it("mirrors the inset for the opposite corner", () => {
    const paddingFraction = 0.02;
    const topLeft = computeSingleCenter(
      "top-left",
      canvasSize,
      contentSize,
      paddingFraction,
      {
        x: 0,
        y: 0,
      },
    );
    const bottomRight = computeSingleCenter(
      "bottom-right",
      canvasSize,
      contentSize,
      paddingFraction,
      { x: 0, y: 0 },
    );
    expect(bottomRight.x).toBeCloseTo(1 - topLeft.x);
    expect(bottomRight.y).toBeCloseTo(1 - topLeft.y);
  });
});

describe("computeRepeatingPlacements", () => {
  it("produces multiple placements whose combined footprint covers the whole canvas, including the edges", () => {
    const placements = computeRepeatingPlacements(
      canvasSize,
      contentSize,
      0.05,
      0,
      0,
    );
    expect(placements.length).toBeGreaterThan(4);
    const leftEdges = placements.map(
      (p) => p.center.x * canvasSize.width - contentSize.width / 2,
    );
    const rightEdges = placements.map(
      (p) => p.center.x * canvasSize.width + contentSize.width / 2,
    );
    expect(Math.min(...leftEdges)).toBeLessThanOrEqual(0);
    expect(Math.max(...rightEdges)).toBeGreaterThanOrEqual(canvasSize.width);
  });

  it("staggers alternating rows when staggerRatio > 0 (diagonal look)", () => {
    const grid = computeRepeatingPlacements(
      canvasSize,
      contentSize,
      0.05,
      0,
      0,
    );
    const staggered = computeRepeatingPlacements(
      canvasSize,
      contentSize,
      0.05,
      0,
      0.5,
    );
    expect(staggered).not.toEqual(grid);
  });

  it("carries the given rotation onto every placement", () => {
    const placements = computeRepeatingPlacements(
      canvasSize,
      contentSize,
      0.1,
      33,
      0,
    );
    expect(placements.every((p) => p.rotationDeg === 33)).toBe(true);
    expect(placements.length).toBeGreaterThan(0);
  });
});

describe("resolvePlacements", () => {
  it("returns exactly one placement for single-position presets", () => {
    const settings: WatermarkLayoutSettings = {
      preset: "center",
      customCenter: { x: 0, y: 0 },
      paddingFraction: 0.02,
      tileSpacingFraction: 0.05,
      rotationDeg: 0,
    };
    expect(resolvePlacements(settings, canvasSize, contentSize)).toHaveLength(
      1,
    );
  });

  it("returns many placements for tiled", () => {
    const settings: WatermarkLayoutSettings = {
      preset: "tiled",
      customCenter: { x: 0, y: 0 },
      paddingFraction: 0.02,
      tileSpacingFraction: 0.05,
      rotationDeg: 0,
    };
    expect(
      resolvePlacements(settings, canvasSize, contentSize).length,
    ).toBeGreaterThan(1);
  });

  it("diagonal uses a 0.5 stagger, producing a different layout than tiled", () => {
    const base: Omit<WatermarkLayoutSettings, "preset"> = {
      customCenter: { x: 0, y: 0 },
      paddingFraction: 0.02,
      tileSpacingFraction: 0.05,
      rotationDeg: -30,
    };
    const tiled = resolvePlacements(
      { ...base, preset: "tiled" },
      canvasSize,
      contentSize,
    );
    const diagonal = resolvePlacements(
      { ...base, preset: "diagonal" },
      canvasSize,
      contentSize,
    );
    expect(diagonal).not.toEqual(tiled);
  });
});

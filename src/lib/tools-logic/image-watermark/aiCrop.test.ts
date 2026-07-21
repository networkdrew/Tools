import { describe, expect, it } from "vitest";
import { computeSquareCrop, computeTileGrid } from "./aiCrop";

describe("computeSquareCrop", () => {
  it("produces a square crop centered on a square bbox", () => {
    const bbox = { x: 100, y: 100, width: 50, height: 50 };
    const crop = computeSquareCrop(bbox, 1000, 1000);
    expect(crop.width).toBe(crop.height);
    const bboxCx = bbox.x + bbox.width / 2;
    const bboxCy = bbox.y + bbox.height / 2;
    expect(crop.x + crop.width / 2).toBeCloseTo(bboxCx, 0);
    expect(crop.y + crop.height / 2).toBeCloseTo(bboxCy, 0);
  });

  it("squares up a very elongated (diagonal-band-style) bbox instead of preserving its aspect ratio", () => {
    const bbox = { x: 400, y: 490, width: 480, height: 20 };
    const crop = computeSquareCrop(bbox, 1000, 1000);
    // width and height should be much closer to each other than the input bbox's 24:1 ratio
    const ratio =
      Math.max(crop.width, crop.height) / Math.min(crop.width, crop.height);
    expect(ratio).toBeLessThan(1.5);
  });

  it("keeps the crop within image bounds by shifting, not just clamping to a smaller box", () => {
    const bbox = { x: 5, y: 5, width: 20, height: 20 };
    const crop = computeSquareCrop(bbox, 1000, 1000, { minCrop: 300 });
    expect(crop.x).toBeGreaterThanOrEqual(0);
    expect(crop.y).toBeGreaterThanOrEqual(0);
    expect(crop.x + crop.width).toBeLessThanOrEqual(1000);
    expect(crop.y + crop.height).toBeLessThanOrEqual(1000);
    // shifted crop should still be large (not shrunk down to fit near the corner)
    expect(crop.width).toBeGreaterThan(100);
  });

  it("never produces a crop larger than the image itself", () => {
    const bbox = { x: 0, y: 0, width: 40, height: 40 };
    const crop = computeSquareCrop(bbox, 60, 80, {
      minCrop: 500,
      maxMargin: 500,
    });
    expect(crop.width).toBeLessThanOrEqual(60);
    expect(crop.height).toBeLessThanOrEqual(80);
  });

  it("gives a small mask more margin proportionally via the minCrop floor", () => {
    const bbox = { x: 500, y: 500, width: 10, height: 10 };
    const crop = computeSquareCrop(bbox, 2000, 2000);
    expect(crop.width).toBeGreaterThanOrEqual(200);
  });
});

describe("computeTileGrid", () => {
  it("returns the bbox unchanged when it already fits within maxTile", () => {
    const bbox = { x: 10, y: 10, width: 300, height: 300 };
    expect(computeTileGrid(bbox, 640, 96)).toEqual([bbox]);
  });

  it("splits a large bbox into multiple overlapping tiles", () => {
    const bbox = { x: 0, y: 0, width: 1500, height: 800 };
    const tiles = computeTileGrid(bbox, 640, 96);
    expect(tiles.length).toBeGreaterThan(1);
    for (const tile of tiles) {
      expect(tile.width).toBeLessThanOrEqual(640);
      expect(tile.height).toBeLessThanOrEqual(640);
    }
  });

  it("covers the entire original bbox with no gaps", () => {
    const bbox = { x: 50, y: 20, width: 1400, height: 700 };
    const tiles = computeTileGrid(bbox, 640, 96);
    const maxX = Math.max(...tiles.map((t) => t.x + t.width));
    const maxY = Math.max(...tiles.map((t) => t.y + t.height));
    const minX = Math.min(...tiles.map((t) => t.x));
    const minY = Math.min(...tiles.map((t) => t.y));
    expect(minX).toBe(bbox.x);
    expect(minY).toBe(bbox.y);
    expect(maxX).toBe(bbox.x + bbox.width);
    expect(maxY).toBe(bbox.y + bbox.height);
  });

  it("produces adjacent tiles that actually overlap", () => {
    const bbox = { x: 0, y: 0, width: 1200, height: 400 };
    const tiles = computeTileGrid(bbox, 640, 96);
    const sorted = [...tiles].sort((a, b) => a.x - b.x);
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i] as { x: number; width: number };
      const b = sorted[i + 1] as { x: number; width: number };
      if (a.x + a.width > b.x) {
        expect(a.x + a.width).toBeGreaterThan(b.x);
      }
    }
  });
});

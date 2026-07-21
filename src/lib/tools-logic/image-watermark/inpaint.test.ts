import { describe, expect, it } from "vitest";
import {
  applyCloneStamp,
  applyContentAwareFill,
  type RGBAImage,
} from "./inpaint";
import {
  rasterizeOperation,
  type CloneOperation,
  type RepairOperation,
} from "./maskOps";

function solidImage(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
): RGBAImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return { data, width, height };
}

function pixelAt(
  image: RGBAImage,
  x: number,
  y: number,
): [number, number, number, number] {
  const i = (y * image.width + x) * 4;
  return [
    image.data[i] ?? 0,
    image.data[i + 1] ?? 0,
    image.data[i + 2] ?? 0,
    image.data[i + 3] ?? 0,
  ];
}

describe("applyContentAwareFill", () => {
  it("reconstructs a uniform-color region from its surroundings", () => {
    const image = solidImage(20, 20, 200, 50, 50);
    const op: RepairOperation = {
      id: "1",
      kind: "brush",
      points: [{ x: 0.5, y: 0.5 }],
      radius: 0.15,
      feather: 0.05,
    };
    const rasterized = rasterizeOperation(op, image.width, image.height)!;
    applyContentAwareFill(image, rasterized);

    const [r, g, b] = pixelAt(image, 10, 10);
    expect(r).toBeCloseTo(200, -1);
    expect(g).toBeCloseTo(50, -1);
    expect(b).toBeCloseTo(50, -1);
  });

  it("produces a value between the two boundary colors for a gradient background, not a flat patch", () => {
    const width = 40;
    const height = 10;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const value = Math.round((x / (width - 1)) * 255);
        const i = (y * width + x) * 4;
        data[i] = value;
        data[i + 1] = 0;
        data[i + 2] = 0;
        data[i + 3] = 255;
      }
    }
    const image: RGBAImage = { data, width, height };

    const leftBoundary = pixelAt(image, 14, 5)[0];
    const rightBoundary = pixelAt(image, 25, 5)[0];

    const op: RepairOperation = {
      id: "1",
      kind: "box",
      rect: { x: 15 / width, y: 0, width: 10 / width, height: 1 },
      feather: 0.02,
    };
    const rasterized = rasterizeOperation(op, width, height)!;
    applyContentAwareFill(image, rasterized);

    const center = pixelAt(image, 20, 5)[0];
    expect(center).toBeGreaterThan(Math.min(leftBoundary, rightBoundary) - 5);
    expect(center).toBeLessThan(Math.max(leftBoundary, rightBoundary) + 5);
  });

  it("leaves pixels outside the mask untouched", () => {
    const image = solidImage(20, 20, 10, 20, 30);
    const op: RepairOperation = {
      id: "1",
      kind: "brush",
      points: [{ x: 0.5, y: 0.5 }],
      radius: 0.1,
      feather: 0.02,
    };
    const rasterized = rasterizeOperation(op, image.width, image.height)!;
    applyContentAwareFill(image, rasterized);
    expect(pixelAt(image, 0, 0)).toEqual([10, 20, 30, 255]);
  });
});

describe("applyCloneStamp", () => {
  it("copies pixels from the source offset onto the destination", () => {
    const width = 20;
    const height = 20;
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const isLeft = x < width / 2;
        data[i] = isLeft ? 0 : 0;
        data[i + 1] = isLeft ? 0 : 255;
        data[i + 2] = isLeft ? 255 : 0;
        data[i + 3] = 255;
      }
    }
    const image: RGBAImage = { data, width, height };

    const op: CloneOperation = {
      id: "1",
      kind: "clone",
      points: [{ x: 0.75, y: 0.5 }],
      radius: 0.1,
      feather: 0.02,
      sourceOffset: { x: -0.5, y: 0 },
    };
    const rasterized = rasterizeOperation(op, width, height)!;
    applyCloneStamp(image, op, rasterized);

    const [, g, b] = pixelAt(image, 15, 10);
    expect(b).toBeGreaterThan(g);
  });

  it("skips samples whose source falls outside the image", () => {
    const image = solidImage(10, 10, 1, 2, 3);
    const op: CloneOperation = {
      id: "1",
      kind: "clone",
      points: [{ x: 0.1, y: 0.5 }],
      radius: 0.1,
      feather: 0.02,
      sourceOffset: { x: -1, y: 0 }, // source falls off the left edge entirely
    };
    const rasterized = rasterizeOperation(op, image.width, image.height)!;
    expect(() => applyCloneStamp(image, op, rasterized)).not.toThrow();
    expect(pixelAt(image, 1, 5)).toEqual([1, 2, 3, 255]);
  });
});

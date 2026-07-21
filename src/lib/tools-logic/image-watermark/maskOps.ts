import { clamp } from "./geometry";

/** A point as a 0..1 fraction of the image's width/height, so an operation replays identically at any resolution. */
export interface NormPoint {
  x: number;
  y: number;
}

interface BaseOperation {
  id: string;
  /** Feather width, as a fraction of image width, blended at the edge of the affected region. */
  feather: number;
}

export interface BrushOperation extends BaseOperation {
  kind: "brush";
  points: NormPoint[];
  /** Brush radius, as a fraction of image width. */
  radius: number;
}

export interface CloneOperation extends BaseOperation {
  kind: "clone";
  points: NormPoint[];
  radius: number;
  /** Source offset (current point + offset = sample point), normalized. */
  sourceOffset: NormPoint;
}

export interface BoxOperation extends BaseOperation {
  kind: "box";
  rect: { x: number; y: number; width: number; height: number };
}

export interface LassoOperation extends BaseOperation {
  kind: "lasso";
  points: NormPoint[];
}

export type RepairOperation =
  BrushOperation | CloneOperation | BoxOperation | LassoOperation;

export interface PixelBBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RasterizedMask {
  /** `bbox.width * bbox.height` weights in 0..255, local to `bbox`. */
  mask: Uint8ClampedArray;
  bbox: PixelBBox;
}

function clampBBoxToImage(
  bbox: PixelBBox,
  imageWidth: number,
  imageHeight: number,
): PixelBBox | null {
  const x0 = Math.max(0, Math.floor(bbox.x));
  const y0 = Math.max(0, Math.floor(bbox.y));
  const x1 = Math.min(imageWidth, Math.ceil(bbox.x + bbox.width));
  const y1 = Math.min(imageHeight, Math.ceil(bbox.y + bbox.height));
  if (x1 <= x0 || y1 <= y0) return null;
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

function distanceToSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(px - ax, py - ay);
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / lengthSq, 0, 1);
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function distanceToPolyline(
  px: number,
  py: number,
  points: { x: number; y: number }[],
): number {
  if (points.length === 0) return Infinity;
  if (points.length === 1) {
    const p = points[0] as { x: number; y: number };
    return Math.hypot(px - p.x, py - p.y);
  }
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i] as { x: number; y: number };
    const b = points[i + 1] as { x: number; y: number };
    best = Math.min(best, distanceToSegment(px, py, a.x, a.y, b.x, b.y));
  }
  return best;
}

function rasterizeStroke(
  points: NormPoint[],
  radiusFraction: number,
  featherFraction: number,
  imageWidth: number,
  imageHeight: number,
): RasterizedMask | null {
  if (points.length === 0) return null;
  const px = points.map((p) => ({ x: p.x * imageWidth, y: p.y * imageHeight }));
  const radius = Math.max(0, radiusFraction * imageWidth);
  const feather = Math.max(0, featherFraction * imageWidth);
  const pad = radius + feather + 1;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of px) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }

  const bbox = clampBBoxToImage(
    {
      x: minX - pad,
      y: minY - pad,
      width: maxX - minX + pad * 2,
      height: maxY - minY + pad * 2,
    },
    imageWidth,
    imageHeight,
  );
  if (!bbox) return null;

  const mask = new Uint8ClampedArray(bbox.width * bbox.height);
  for (let y = 0; y < bbox.height; y++) {
    const wy = bbox.y + y + 0.5;
    for (let x = 0; x < bbox.width; x++) {
      const wx = bbox.x + x + 0.5;
      const dist = distanceToPolyline(wx, wy, px);
      let weight = 0;
      if (dist <= radius) weight = 255;
      else if (dist <= radius + feather)
        weight = 255 * (1 - (dist - radius) / feather);
      if (weight > 0) mask[y * bbox.width + x] = weight;
    }
  }
  return { mask, bbox };
}

function rasterizeBox(
  op: BoxOperation,
  imageWidth: number,
  imageHeight: number,
): RasterizedMask | null {
  const rectPx = {
    x: op.rect.x * imageWidth,
    y: op.rect.y * imageHeight,
    width: op.rect.width * imageWidth,
    height: op.rect.height * imageHeight,
  };
  const bbox = clampBBoxToImage(rectPx, imageWidth, imageHeight);
  if (!bbox) return null;

  const featherPx = Math.max(0, op.feather * imageWidth);
  const mask = new Uint8ClampedArray(bbox.width * bbox.height);
  for (let y = 0; y < bbox.height; y++) {
    const wy = bbox.y + y + 0.5;
    const insetY = Math.min(wy - rectPx.y, rectPx.y + rectPx.height - wy);
    for (let x = 0; x < bbox.width; x++) {
      const wx = bbox.x + x + 0.5;
      const insetX = Math.min(wx - rectPx.x, rectPx.x + rectPx.width - wx);
      const inset = Math.min(insetX, insetY);
      if (inset <= 0) continue;
      const weight =
        featherPx <= 0 ? 255 : Math.min(255, 255 * (inset / featherPx));
      mask[y * bbox.width + x] = weight;
    }
  }
  return { mask, bbox };
}

function rasterizeLasso(
  op: LassoOperation,
  imageWidth: number,
  imageHeight: number,
): RasterizedMask | null {
  if (op.points.length < 3) return null;
  const px = op.points.map((p) => ({
    x: p.x * imageWidth,
    y: p.y * imageHeight,
  }));

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of px) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const bbox = clampBBoxToImage(
    { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    imageWidth,
    imageHeight,
  );
  if (!bbox) return null;

  const mask = new Uint8ClampedArray(bbox.width * bbox.height);
  for (let y = 0; y < bbox.height; y++) {
    const wy = bbox.y + y + 0.5;
    const intersections: number[] = [];
    for (let i = 0; i < px.length; i++) {
      const a = px[i] as { x: number; y: number };
      const b = px[(i + 1) % px.length] as { x: number; y: number };
      if (a.y === b.y) continue;
      if (wy < Math.min(a.y, b.y) || wy >= Math.max(a.y, b.y)) continue;
      const t = (wy - a.y) / (b.y - a.y);
      intersections.push(a.x + t * (b.x - a.x));
    }
    intersections.sort((a, b) => a - b);
    for (let i = 0; i + 1 < intersections.length; i += 2) {
      const xStart = Math.max(bbox.x, Math.round(intersections[i] as number));
      const xEnd = Math.min(
        bbox.x + bbox.width,
        Math.round(intersections[i + 1] as number),
      );
      for (let wx = xStart; wx < xEnd; wx++) {
        mask[y * bbox.width + (wx - bbox.x)] = 255;
      }
    }
  }

  const featherPx = Math.max(0, Math.round(op.feather * imageWidth));
  if (featherPx > 0) boxBlurMask(mask, bbox.width, bbox.height, featherPx, 3);
  return { mask, bbox };
}

/** Approximates a Gaussian feather with repeated box blurs — cheap and dependency-free. */
export function boxBlurMask(
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
  passes: number,
): void {
  if (radius <= 0 || width <= 0 || height <= 0) return;
  let buffer = new Float32Array(mask.length);
  for (let i = 0; i < mask.length; i++) buffer[i] = mask[i] as number;

  for (let pass = 0; pass < passes; pass++) {
    const next = new Float32Array(buffer.length);
    // horizontal
    for (let y = 0; y < height; y++) {
      let sum = 0;
      const row = y * width;
      for (let x = -radius; x <= radius; x++) {
        sum += buffer[row + clamp(x, 0, width - 1)] as number;
      }
      for (let x = 0; x < width; x++) {
        next[row + x] = sum / (radius * 2 + 1);
        const addX = clamp(x + radius + 1, 0, width - 1);
        const removeX = clamp(x - radius, 0, width - 1);
        sum +=
          (buffer[row + addX] as number) - (buffer[row + removeX] as number);
      }
    }
    buffer = next;
    const next2 = new Float32Array(buffer.length);
    // vertical
    for (let x = 0; x < width; x++) {
      let sum = 0;
      for (let y = -radius; y <= radius; y++) {
        sum += buffer[clamp(y, 0, height - 1) * width + x] as number;
      }
      for (let y = 0; y < height; y++) {
        next2[y * width + x] = sum / (radius * 2 + 1);
        const addY = clamp(y + radius + 1, 0, height - 1);
        const removeY = clamp(y - radius, 0, height - 1);
        sum +=
          (buffer[addY * width + x] as number) -
          (buffer[removeY * width + x] as number);
      }
    }
    buffer = next2;
  }
  for (let i = 0; i < mask.length; i++) mask[i] = buffer[i] as number;
}

/** Rasterizes any repair operation to a local mask + bounding box at the given image resolution. */
export function rasterizeOperation(
  op: RepairOperation,
  imageWidth: number,
  imageHeight: number,
): RasterizedMask | null {
  switch (op.kind) {
    case "brush":
    case "clone":
      return rasterizeStroke(
        op.points,
        op.radius,
        op.feather,
        imageWidth,
        imageHeight,
      );
    case "box":
      return rasterizeBox(op, imageWidth, imageHeight);
    case "lasso":
      return rasterizeLasso(op, imageWidth, imageHeight);
  }
}

import {
  rasterizeOperation,
  type PixelBBox,
  type RasterizedMask,
  type RepairOperation,
} from "./maskOps";

/**
 * One user action while building an AI-removal selection: either paints
 * onto it ("add") or erases from it ("erase"). Kept separate from the
 * committed `RepairOperation` history used elsewhere so a selection can be
 * freely undone/redone/cleared before the user actually runs removal.
 */
export interface PendingStroke {
  id: string;
  kind: "add" | "erase";
  op: RepairOperation;
}

function intersectBBox(a: PixelBBox, b: PixelBBox): PixelBBox | null {
  const x0 = Math.max(a.x, b.x);
  const y0 = Math.max(a.y, b.y);
  const x1 = Math.min(a.x + a.width, b.x + b.width);
  const y1 = Math.min(a.y + a.height, b.y + b.height);
  if (x1 <= x0 || y1 <= y0) return null;
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/** Subtracts `subtract`'s weight from `target`, returning a new mask (inputs are left untouched). */
export function subtractMask(
  target: RasterizedMask,
  subtract: RasterizedMask,
): RasterizedMask {
  const overlap = intersectBBox(target.bbox, subtract.bbox);
  const mask = Uint8ClampedArray.from(target.mask);
  if (!overlap) return { mask, bbox: target.bbox };

  for (let y = overlap.y; y < overlap.y + overlap.height; y++) {
    const targetRow = (y - target.bbox.y) * target.bbox.width;
    const subRow = (y - subtract.bbox.y) * subtract.bbox.width;
    for (let x = overlap.x; x < overlap.x + overlap.width; x++) {
      const targetIdx = targetRow + (x - target.bbox.x);
      const subIdx = subRow + (x - subtract.bbox.x);
      const subWeight = (subtract.mask[subIdx] ?? 0) / 255;
      if (subWeight <= 0) continue;
      mask[targetIdx] = (mask[targetIdx] ?? 0) * (1 - subWeight);
    }
  }
  return { mask, bbox: target.bbox };
}

export interface ResolvedInstance {
  op: RepairOperation;
  mask: RasterizedMask;
}

/**
 * Resolves the current pending selection into one AI-processing instance per
 * "add" stroke, each with any overlapping "erase" strokes subtracted out.
 * Treating every add stroke as its own instance (rather than merging
 * everything into one mask) is what lets scattered selections — e.g. several
 * occurrences of a repeated watermark — each get their own tight, well-fit
 * crop instead of one crop spanning the whole image (which measurably hurts
 * quality — see the model comparison writeup).
 */
export function resolveAddInstances(
  strokes: PendingStroke[],
  imageWidth: number,
  imageHeight: number,
): ResolvedInstance[] {
  const eraseMasks: RasterizedMask[] = [];
  for (const stroke of strokes) {
    if (stroke.kind !== "erase") continue;
    const rasterized = rasterizeOperation(stroke.op, imageWidth, imageHeight);
    if (rasterized) eraseMasks.push(rasterized);
  }

  const instances: ResolvedInstance[] = [];
  for (const stroke of strokes) {
    if (stroke.kind !== "add") continue;
    let rasterized = rasterizeOperation(stroke.op, imageWidth, imageHeight);
    if (!rasterized) continue;
    for (const erase of eraseMasks) {
      rasterized = subtractMask(rasterized, erase);
    }
    // skip instances erase reduced to nothing
    let hasWeight = false;
    for (let i = 0; i < rasterized.mask.length; i++) {
      if ((rasterized.mask[i] ?? 0) > 0) {
        hasWeight = true;
        break;
      }
    }
    if (hasWeight) instances.push({ op: stroke.op, mask: rasterized });
  }
  return instances;
}

/**
 * A single combined mask covering every "add" stroke minus overlapping
 * "erase" strokes, for drawing the live selection overlay. Not used for AI
 * processing itself (see `resolveAddInstances`), since a full-canvas union
 * bbox would be a poor crop when the strokes are scattered.
 */
export function rasterizeSelectionPreview(
  strokes: PendingStroke[],
  imageWidth: number,
  imageHeight: number,
): RasterizedMask | null {
  const instances = resolveAddInstances(strokes, imageWidth, imageHeight);
  if (instances.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { mask } of instances) {
    minX = Math.min(minX, mask.bbox.x);
    minY = Math.min(minY, mask.bbox.y);
    maxX = Math.max(maxX, mask.bbox.x + mask.bbox.width);
    maxY = Math.max(maxY, mask.bbox.y + mask.bbox.height);
  }
  const bbox: PixelBBox = {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
  const combined = new Uint8ClampedArray(bbox.width * bbox.height);

  for (const { mask } of instances) {
    for (let y = 0; y < mask.bbox.height; y++) {
      const destRow = (mask.bbox.y - bbox.y + y) * bbox.width;
      const srcRow = y * mask.bbox.width;
      for (let x = 0; x < mask.bbox.width; x++) {
        const destIdx = destRow + (mask.bbox.x - bbox.x + x);
        const v = mask.mask[srcRow + x] ?? 0;
        if (v > (combined[destIdx] ?? 0)) combined[destIdx] = v;
      }
    }
  }
  return { mask: combined, bbox };
}

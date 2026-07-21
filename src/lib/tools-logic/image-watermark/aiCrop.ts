import { clamp } from "./geometry";
import type { PixelBBox } from "./maskOps";

export interface SquareCropOptions {
  /** Context margin around the bbox's longest side, as a fraction of that side. */
  marginRatio?: number;
  minMargin?: number;
  maxMargin?: number;
  /** Floor for the crop size, so a tiny mask still gets enough surrounding context. */
  minCrop?: number;
}

const DEFAULTS: Required<SquareCropOptions> = {
  marginRatio: 0.5,
  minMargin: 40,
  maxMargin: 200,
  minCrop: 200,
};

/**
 * A roughly square crop centered on `bbox`, sized to its longest side plus a
 * proportional context margin. AI inpainting models take a fixed square
 * input; feeding them a crop with a very different aspect ratio (e.g. a
 * long thin diagonal selection) forces a non-uniform resize that distorts
 * the content and measurably hurts output quality (verified empirically —
 * see the model comparison in the PR/commit that introduced this). Squaring
 * the crop up front keeps that resize close to uniform in x and y.
 *
 * The window is shifted (not shrunk) to stay within the image bounds
 * whenever there's room, so it only becomes non-square when the image
 * itself is smaller than the desired crop size in that dimension.
 */
export function computeSquareCrop(
  bbox: PixelBBox,
  imageWidth: number,
  imageHeight: number,
  options: SquareCropOptions = {},
): PixelBBox {
  const opts = { ...DEFAULTS, ...options };
  const longSide = Math.max(
    bbox.width,
    bbox.height,
    opts.minCrop - 2 * opts.minMargin,
  );
  const margin = clamp(
    longSide * opts.marginRatio,
    opts.minMargin,
    opts.maxMargin,
  );
  const size = Math.min(
    Math.max(imageWidth, imageHeight),
    longSide + margin * 2,
  );

  const cx = bbox.x + bbox.width / 2;
  const cy = bbox.y + bbox.height / 2;
  const width = Math.min(size, imageWidth);
  const height = Math.min(size, imageHeight);

  let x = cx - size / 2;
  let y = cy - size / 2;
  x = clamp(x, 0, Math.max(0, imageWidth - width));
  y = clamp(y, 0, Math.max(0, imageHeight - height));

  return {
    x: Math.round(x),
    y: Math.round(y),
    width: Math.round(width),
    height: Math.round(height),
  };
}

const DEFAULT_MAX_TILE = 640;
const DEFAULT_TILE_OVERLAP = 96;

/**
 * Splits a large bbox into a grid of overlapping tiles no larger than
 * `maxTile` on a side, so a big selection (e.g. a wide box-select on a
 * high-resolution photo) can still be run through a fixed-resolution model
 * without softening the whole region down to that resolution in one shot.
 * Returns a single-element array (just `bbox`) when it already fits.
 */
export function computeTileGrid(
  bbox: PixelBBox,
  maxTile: number = DEFAULT_MAX_TILE,
  overlap: number = DEFAULT_TILE_OVERLAP,
): PixelBBox[] {
  if (bbox.width <= maxTile && bbox.height <= maxTile) return [bbox];

  const stride = Math.max(1, maxTile - overlap);
  const cols = Math.max(1, Math.ceil((bbox.width - overlap) / stride));
  const rows = Math.max(1, Math.ceil((bbox.height - overlap) / stride));

  const tiles: PixelBBox[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x =
        bbox.x + Math.min(col * stride, Math.max(0, bbox.width - maxTile));
      const y =
        bbox.y + Math.min(row * stride, Math.max(0, bbox.height - maxTile));
      const width = Math.min(maxTile, bbox.x + bbox.width - x);
      const height = Math.min(maxTile, bbox.y + bbox.height - y);
      tiles.push({ x, y, width, height });
    }
  }
  return tiles;
}

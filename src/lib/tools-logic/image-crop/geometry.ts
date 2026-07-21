export interface Size {
  width: number;
  height: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** 90-degree rotation steps only — enough for "rotate and flip", without free-angle math. */
export type Rotation = 0 | 90 | 180 | 270;

export type HandleId = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/** The pixel dimensions of an image after rotation — width/height swap at 90 and 270 degrees. */
export function orientedSize(size: Size, rotation: Rotation): Size {
  return rotation === 90 || rotation === 270
    ? { width: size.height, height: size.width }
    : { width: size.width, height: size.height };
}

export function normalizeRotation(degrees: number): Rotation {
  const normalized = ((degrees % 360) + 360) % 360;
  return normalized as Rotation;
}

export function rotateClockwise(rotation: Rotation): Rotation {
  return normalizeRotation(rotation + 90);
}

export function rotateCounterClockwise(rotation: Rotation): Rotation {
  return normalizeRotation(rotation - 90);
}

/** Clamps a rect's size to fit within bounds, then its position so it stays fully inside. */
export function clampRectToBounds(rect: Rect, bounds: Size, minSize = 1): Rect {
  const width = clamp(
    rect.width,
    Math.min(minSize, bounds.width),
    bounds.width,
  );
  const height = clamp(
    rect.height,
    Math.min(minSize, bounds.height),
    bounds.height,
  );
  const x = clamp(rect.x, 0, bounds.width - width);
  const y = clamp(rect.y, 0, bounds.height - height);
  return { x, y, width, height };
}

/** The largest centered rect matching `aspect` (width/height) that fits within bounds, or the full bounds if `aspect` is null (freeform). */
export function initialCropRect(bounds: Size, aspect: number | null): Rect {
  if (!aspect || !Number.isFinite(aspect) || aspect <= 0) {
    return { x: 0, y: 0, width: bounds.width, height: bounds.height };
  }

  const boundsAspect = bounds.width / bounds.height;
  let width: number;
  let height: number;
  if (boundsAspect > aspect) {
    height = bounds.height;
    width = height * aspect;
  } else {
    width = bounds.width;
    height = width / aspect;
  }

  return {
    x: (bounds.width - width) / 2,
    y: (bounds.height - height) / 2,
    width,
    height,
  };
}

export function moveRect(
  rect: Rect,
  dx: number,
  dy: number,
  bounds: Size,
): Rect {
  const x = clamp(rect.x + dx, 0, Math.max(0, bounds.width - rect.width));
  const y = clamp(rect.y + dy, 0, Math.max(0, bounds.height - rect.height));
  return { ...rect, x, y };
}

export function scaleRect(rect: Rect, factor: number): Rect {
  return {
    x: rect.x * factor,
    y: rect.y * factor,
    width: rect.width * factor,
    height: rect.height * factor,
  };
}

const HANDLE_EDGES: Record<
  HandleId,
  { left?: true; right?: true; top?: true; bottom?: true }
> = {
  n: { top: true },
  s: { bottom: true },
  e: { right: true },
  w: { left: true },
  ne: { top: true, right: true },
  nw: { top: true, left: true },
  se: { bottom: true, right: true },
  sw: { bottom: true, left: true },
};

export interface HandleDragOptions {
  minSize?: number;
  /** width/height ratio to preserve, or null/undefined to resize freely. */
  aspect?: number | null;
}

/**
 * Computes the new crop rect after dragging one of the 8 resize handles by
 * (dx, dy). The edges not touched by the handle stay fixed; when `aspect` is
 * set, corner handles keep their opposite corner anchored while edge handles
 * (n/s/e/w) grow or shrink symmetrically about the rect's center, since an
 * edge handle has no natural anchor corner to derive the locked dimension from.
 */
export function applyHandleDrag(
  rect: Rect,
  handle: HandleId,
  dx: number,
  dy: number,
  bounds: Size,
  opts: HandleDragOptions = {},
): Rect {
  const minSize = Math.max(1, opts.minSize ?? 10);
  const aspect = opts.aspect ?? null;
  const edges = HANDLE_EDGES[handle];

  const left0 = rect.x;
  const top0 = rect.y;
  const right0 = rect.x + rect.width;
  const bottom0 = rect.y + rect.height;

  let left = left0;
  let top = top0;
  let right = right0;
  let bottom = bottom0;

  if (edges.left) left = clamp(left0 + dx, 0, right0 - minSize);
  if (edges.right) right = clamp(right0 + dx, left0 + minSize, bounds.width);
  if (edges.top) top = clamp(top0 + dy, 0, bottom0 - minSize);
  if (edges.bottom) bottom = clamp(bottom0 + dy, top0 + minSize, bounds.height);

  let width = right - left;
  let height = bottom - top;

  if (aspect && Number.isFinite(aspect) && aspect > 0) {
    const touchesHorizontal = Boolean(edges.left || edges.right);
    const touchesVertical = Boolean(edges.top || edges.bottom);

    if (touchesHorizontal && touchesVertical) {
      height = width / aspect;
      if (edges.top) top = bottom - height;
      else bottom = top + height;
    } else if (touchesHorizontal) {
      height = width / aspect;
      const centerY = (top0 + bottom0) / 2;
      top = centerY - height / 2;
      bottom = centerY + height / 2;
    } else if (touchesVertical) {
      width = height * aspect;
      const centerX = (left0 + right0) / 2;
      left = centerX - width / 2;
      right = centerX + width / 2;
    }
  }

  return clampRectToBounds(
    { x: left, y: top, width: right - left, height: bottom - top },
    bounds,
    minSize,
  );
}

export function rectAspect(rect: Rect): number {
  return rect.height === 0 ? 0 : rect.width / rect.height;
}

/** Above this, the interactive preview is downscaled — full resolution is only used for export. */
export const MAX_PREVIEW_DIMENSION = 1200;

/** Scales `size` down (never up) so its longest side is at most `maxDim`, preserving aspect ratio. */
export function computePreviewSize(
  size: Size,
  maxDim: number = MAX_PREVIEW_DIMENSION,
): Size {
  const largest = Math.max(size.width, size.height);
  if (largest <= maxDim || largest <= 0) return { ...size };
  const scale = maxDim / largest;
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

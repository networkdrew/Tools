import type { Rect, Size } from "./geometry";

export type FitMode = "fit" | "fill" | "exact";

export interface CompositePlan {
  canvasWidth: number;
  canvasHeight: number;
  /** The region of the crop (in crop-local pixel coordinates) to draw from. */
  sourceRect: Rect;
  /** Whether the plan required enlarging pixels beyond the crop's own resolution. */
  upscaled: boolean;
}

export type CompositeResult =
  { ok: true; value: CompositePlan } | { ok: false; message: string };

function wholeCropSourceRect(size: Size): Rect {
  return { x: 0, y: 0, width: size.width, height: size.height };
}

/**
 * Computes how a cropped region maps onto a final output canvas for the
 * chosen fit mode:
 *  - "fit": scales the whole crop down to fit within target (contain);
 *    output dimensions may be smaller than target on one axis.
 *  - "fill": scales and center-crops the crop to exactly fill target (cover).
 *  - "exact": stretches the crop to exactly target, ignoring aspect ratio.
 *
 * Unless `allowUpscale` is true, no axis is ever scaled beyond 1x — "never
 * upscale unless the user explicitly enables it" applies uniformly across
 * all three modes, which can mean the actual output is smaller than the
 * requested target when the crop itself is smaller than it.
 */
export function computeCompositePlan(
  cropSize: Size,
  target: Size,
  mode: FitMode,
  allowUpscale: boolean,
): CompositeResult {
  if (
    !Number.isFinite(cropSize.width) ||
    !Number.isFinite(cropSize.height) ||
    cropSize.width <= 0 ||
    cropSize.height <= 0
  ) {
    return { ok: false, message: "The crop area has no visible size." };
  }
  if (
    !Number.isFinite(target.width) ||
    !Number.isFinite(target.height) ||
    target.width <= 0 ||
    target.height <= 0
  ) {
    return {
      ok: false,
      message: "Output width and height must be greater than 0.",
    };
  }

  if (mode === "exact") {
    const rawScaleX = target.width / cropSize.width;
    const rawScaleY = target.height / cropSize.height;
    const scaleX = allowUpscale ? rawScaleX : Math.min(rawScaleX, 1);
    const scaleY = allowUpscale ? rawScaleY : Math.min(rawScaleY, 1);
    return {
      ok: true,
      value: {
        canvasWidth: Math.max(1, Math.round(cropSize.width * scaleX)),
        canvasHeight: Math.max(1, Math.round(cropSize.height * scaleY)),
        sourceRect: wholeCropSourceRect(cropSize),
        upscaled: scaleX > 1 || scaleY > 1,
      },
    };
  }

  if (mode === "fit") {
    const rawScale = Math.min(
      target.width / cropSize.width,
      target.height / cropSize.height,
    );
    const scale = allowUpscale ? rawScale : Math.min(rawScale, 1);
    return {
      ok: true,
      value: {
        canvasWidth: Math.max(1, Math.round(cropSize.width * scale)),
        canvasHeight: Math.max(1, Math.round(cropSize.height * scale)),
        sourceRect: wholeCropSourceRect(cropSize),
        upscaled: scale > 1,
      },
    };
  }

  // mode === "fill"
  const rawScale = Math.max(
    target.width / cropSize.width,
    target.height / cropSize.height,
  );
  const wouldUpscale = rawScale > 1;

  if (!allowUpscale && wouldUpscale) {
    // Can't cover the target without enlarging pixels — degrade to the
    // "fit" behavior (show the whole crop, output may be smaller than target).
    const scale = Math.min(
      target.width / cropSize.width,
      target.height / cropSize.height,
      1,
    );
    return {
      ok: true,
      value: {
        canvasWidth: Math.max(1, Math.round(cropSize.width * scale)),
        canvasHeight: Math.max(1, Math.round(cropSize.height * scale)),
        sourceRect: wholeCropSourceRect(cropSize),
        upscaled: false,
      },
    };
  }

  const sourceWidth = target.width / rawScale;
  const sourceHeight = target.height / rawScale;
  return {
    ok: true,
    value: {
      canvasWidth: Math.max(1, Math.round(target.width)),
      canvasHeight: Math.max(1, Math.round(target.height)),
      sourceRect: {
        x: (cropSize.width - sourceWidth) / 2,
        y: (cropSize.height - sourceHeight) / 2,
        width: sourceWidth,
        height: sourceHeight,
      },
      upscaled: wouldUpscale,
    },
  };
}

export type DimensionsResult =
  { ok: true; value: Size } | { ok: false; message: string };

/** Computes pixel dimensions from a percentage of the crop's own size. */
export function dimensionsFromPercent(
  cropSize: Size,
  percent: number,
): DimensionsResult {
  if (!Number.isFinite(percent) || percent <= 0) {
    return { ok: false, message: "Percentage must be greater than 0." };
  }
  return {
    ok: true,
    value: {
      width: Math.max(1, Math.round((cropSize.width * percent) / 100)),
      height: Math.max(1, Math.round((cropSize.height * percent) / 100)),
    },
  };
}

/** Recomputes the other dimension to preserve `ratio` (width/height) after one field changes. */
export function linkedDimension(
  changed: "width" | "height",
  width: number,
  height: number,
  ratio: number,
): Size {
  if (!Number.isFinite(ratio) || ratio <= 0) return { width, height };
  return changed === "width"
    ? { width, height: Math.max(1, Math.round(width / ratio)) }
    : { width: Math.max(1, Math.round(height * ratio)), height };
}

export interface Dimensions {
  width: number;
  height: number;
}

export type ResizeMode = "none" | "scale" | "fit";

export interface ResizeOptions {
  mode: ResizeMode;
  /** Used when mode is "scale". Percentage of the original size, e.g. 50 for half size. */
  scalePercent?: number;
  /** Used when mode is "fit". The image is shrunk (never enlarged) to fit within these bounds. */
  maxWidth?: number;
  maxHeight?: number;
}

export type DimensionsResult =
  { ok: true; value: Dimensions } | { ok: false; message: string };

/** Computes the output pixel dimensions for a resize operation, preserving aspect ratio. */
export function computeTargetDimensions(
  original: Dimensions,
  options: ResizeOptions,
): DimensionsResult {
  if (
    !Number.isFinite(original.width) ||
    !Number.isFinite(original.height) ||
    original.width <= 0 ||
    original.height <= 0
  ) {
    return { ok: false, message: "The image has no visible dimensions." };
  }

  if (options.mode === "none") {
    return { ok: true, value: { ...original } };
  }

  if (options.mode === "scale") {
    const percent = options.scalePercent ?? 100;
    if (!Number.isFinite(percent) || percent <= 0) {
      return {
        ok: false,
        message: "Scale percentage must be greater than 0.",
      };
    }
    return {
      ok: true,
      value: {
        width: Math.max(1, Math.round((original.width * percent) / 100)),
        height: Math.max(1, Math.round((original.height * percent) / 100)),
      },
    };
  }

  // mode === "fit"
  const maxWidth = options.maxWidth ?? original.width;
  const maxHeight = options.maxHeight ?? original.height;
  if (
    !Number.isFinite(maxWidth) ||
    maxWidth <= 0 ||
    !Number.isFinite(maxHeight) ||
    maxHeight <= 0
  ) {
    return {
      ok: false,
      message: "Max width and max height must be greater than 0.",
    };
  }

  const ratio = Math.min(
    maxWidth / original.width,
    maxHeight / original.height,
    1,
  );
  return {
    ok: true,
    value: {
      width: Math.max(1, Math.round(original.width * ratio)),
      height: Math.max(1, Math.round(original.height * ratio)),
    },
  };
}

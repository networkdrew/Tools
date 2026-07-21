import { clamp, type Point, type Size } from "./geometry";

export type PositionPreset =
  | "custom"
  | "center"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "tiled"
  | "diagonal";

export const POSITION_PRESETS: { value: PositionPreset; label: string }[] = [
  { value: "center", label: "Center" },
  { value: "top-left", label: "Top left" },
  { value: "top-right", label: "Top right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-right", label: "Bottom right" },
  { value: "tiled", label: "Tiled" },
  { value: "diagonal", label: "Diagonal repeat" },
  { value: "custom", label: "Custom (drag on preview)" },
];

/** One instance of the watermark to paint: a normalized (0..1) center and its rotation. */
export interface Placement {
  center: Point;
  rotationDeg: number;
}

export interface WatermarkLayoutSettings {
  preset: PositionPreset;
  /** Normalized center used when `preset === "custom"`. */
  customCenter: Point;
  /** Distance from the canvas edge for corner presets, as a fraction of canvas width. */
  paddingFraction: number;
  /** Spacing between repeats for "tiled"/"diagonal", as a fraction of canvas width. */
  tileSpacingFraction: number;
  rotationDeg: number;
}

const SINGLE_PRESETS = new Set<PositionPreset>([
  "custom",
  "center",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
]);

export function isRepeatingPreset(
  preset: PositionPreset,
): preset is "tiled" | "diagonal" {
  return !SINGLE_PRESETS.has(preset);
}

/** Computes the normalized center for one of the single (non-repeating) presets. */
export function computeSingleCenter(
  preset: Exclude<PositionPreset, "tiled" | "diagonal">,
  canvasSize: Size,
  contentSize: Size,
  paddingFraction: number,
  customCenter: Point,
): Point {
  if (preset === "custom") {
    return {
      x: clamp(customCenter.x, 0, 1),
      y: clamp(customCenter.y, 0, 1),
    };
  }
  if (preset === "center") return { x: 0.5, y: 0.5 };

  const paddingPx = paddingFraction * canvasSize.width;
  const halfW = contentSize.width / 2;
  const halfH = contentSize.height / 2;

  const left = (paddingPx + halfW) / canvasSize.width;
  const right = 1 - (paddingPx + halfW) / canvasSize.width;
  const top = (paddingPx + halfH) / canvasSize.height;
  const bottom = 1 - (paddingPx + halfH) / canvasSize.height;

  switch (preset) {
    case "top-left":
      return { x: left, y: top };
    case "top-right":
      return { x: right, y: top };
    case "bottom-left":
      return { x: left, y: bottom };
    case "bottom-right":
      return { x: right, y: bottom };
  }
}

/**
 * Computes a grid of normalized placements that fully covers the canvas,
 * including partial repeats that bleed off the edges. `staggerRatio` of 0.5
 * offsets alternating rows by half a cell, which is what turns a plain grid
 * into a "diagonal repeat" look when combined with a rotated watermark.
 */
export function computeRepeatingPlacements(
  canvasSize: Size,
  contentSize: Size,
  spacingFraction: number,
  rotationDeg: number,
  staggerRatio = 0,
): Placement[] {
  const spacingPx = Math.max(1, spacingFraction * canvasSize.width);
  const cellW = Math.max(1, contentSize.width + spacingPx);
  const cellH = Math.max(1, contentSize.height + spacingPx);

  const placements: Placement[] = [];
  const rowCount = Math.ceil(canvasSize.height / cellH) + 2;
  const colCount = Math.ceil(canvasSize.width / cellW) + 2;

  for (let row = -1; row < rowCount - 1; row++) {
    const rowOffset = row % 2 !== 0 ? staggerRatio * cellW : 0;
    for (let col = -1; col < colCount - 1; col++) {
      const x = col * cellW + rowOffset;
      const y = row * cellH;
      // Skip repeats whose bounding box can't possibly touch the canvas.
      if (
        x + contentSize.width < 0 ||
        x - contentSize.width > canvasSize.width ||
        y + contentSize.height < 0 ||
        y - contentSize.height > canvasSize.height
      ) {
        continue;
      }
      placements.push({
        center: {
          x: x / canvasSize.width,
          y: y / canvasSize.height,
        },
        rotationDeg,
      });
    }
  }
  return placements;
}

/** Resolves a full layout to the list of placements it should paint. */
export function resolvePlacements(
  settings: WatermarkLayoutSettings,
  canvasSize: Size,
  contentSize: Size,
): Placement[] {
  if (settings.preset === "tiled") {
    return computeRepeatingPlacements(
      canvasSize,
      contentSize,
      settings.tileSpacingFraction,
      settings.rotationDeg,
      0,
    );
  }
  if (settings.preset === "diagonal") {
    return computeRepeatingPlacements(
      canvasSize,
      contentSize,
      settings.tileSpacingFraction,
      settings.rotationDeg,
      0.5,
    );
  }
  return [
    {
      center: computeSingleCenter(
        settings.preset,
        canvasSize,
        contentSize,
        settings.paddingFraction,
        settings.customCenter,
      ),
      rotationDeg: settings.rotationDeg,
    },
  ];
}

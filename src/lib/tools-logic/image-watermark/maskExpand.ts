import { clamp } from "./geometry";

/**
 * Grows the high-weight ("hole") region of a mask outward by `radiusPx`
 * using a max filter, mutating `mask` in place. Run before AI inpainting so
 * a slightly-imprecise brush/box selection doesn't leave a thin unrepaired
 * rim right at the edge of what the user painted — a standard step before
 * feeding a mask to an inpainting model. Pair with `boxBlurMask` afterward
 * to feather the now-expanded edge.
 */
export function dilateMask(
  mask: Uint8ClampedArray,
  width: number,
  height: number,
  radiusPx: number,
): void {
  const radius = Math.round(radiusPx);
  if (radius <= 0 || width <= 0 || height <= 0) return;

  const source = new Uint8ClampedArray(mask);

  // horizontal max-filter pass
  const horizontal = new Uint8ClampedArray(mask.length);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      let maxVal = 0;
      const lo = Math.max(0, x - radius);
      const hi = Math.min(width - 1, x + radius);
      for (let sx = lo; sx <= hi; sx++) {
        const v = source[row + sx] ?? 0;
        if (v > maxVal) maxVal = v;
      }
      horizontal[row + x] = maxVal;
    }
  }

  // vertical max-filter pass
  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      let maxVal = 0;
      const lo = Math.max(0, y - radius);
      const hi = Math.min(height - 1, y + radius);
      for (let sy = lo; sy <= hi; sy++) {
        const v = horizontal[sy * width + x] ?? 0;
        if (v > maxVal) maxVal = v;
      }
      mask[y * width + x] = maxVal;
    }
  }
}

/** Clamps a pixel radius so UI-driven expand amounts stay within a sane range. */
export function clampExpandRadius(radiusPx: number): number {
  return clamp(radiusPx, 0, 64);
}

/**
 * Pure coordinate-space math shared by the watermark and repair editors:
 * screen px -> canvas px -> normalized (0..1) image fraction -> any target
 * resolution's px. Normalized fractions are the one representation stored in
 * state, so a placement or mask op computed against a small preview canvas
 * replays identically against the full-resolution export canvas.
 */

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export function clamp(value: number, min: number, max: number): number {
  if (min > max) return min;
  return Math.min(max, Math.max(min, value));
}

/** Converts a pixel point in `size`'s coordinate space to a 0..1 fraction. */
export function toNormalized(point: Point, size: Size): Point {
  if (size.width <= 0 || size.height <= 0) return { x: 0, y: 0 };
  return { x: point.x / size.width, y: point.y / size.height };
}

/** Converts a 0..1 normalized fraction to a pixel point in `size`'s space. */
export function toPixels(normalized: Point, size: Size): Point {
  return { x: normalized.x * size.width, y: normalized.y * size.height };
}

/** Re-expresses a pixel point from one resolution's space into another's. */
export function mapPointBetweenSizes(
  point: Point,
  fromSize: Size,
  toSize: Size,
): Point {
  return toPixels(toNormalized(point, fromSize), toSize);
}

/** A length expressed as a fraction of width scales the same way between resolutions. */
export function mapLengthBetweenSizes(
  length: number,
  fromWidth: number,
  toWidth: number,
): number {
  if (fromWidth <= 0) return 0;
  return (length / fromWidth) * toWidth;
}

/**
 * Zoom/pan viewport: the canvas is drawn at its native working resolution,
 * then displayed via `translate(pan) scale(zoom)`. Converts a pointer
 * position (relative to the viewport container's top-left) into a pixel
 * coordinate on that working-resolution canvas.
 */
export function screenToCanvasPoint(
  screenPoint: Point,
  containerOrigin: Point,
  zoom: number,
  pan: Point,
): Point {
  const z = zoom <= 0 ? 1 : zoom;
  return {
    x: (screenPoint.x - containerOrigin.x - pan.x) / z,
    y: (screenPoint.y - containerOrigin.y - pan.y) / z,
  };
}

export function canvasToScreenPoint(
  canvasPoint: Point,
  containerOrigin: Point,
  zoom: number,
  pan: Point,
): Point {
  return {
    x: canvasPoint.x * zoom + pan.x + containerOrigin.x,
    y: canvasPoint.y * zoom + pan.y + containerOrigin.y,
  };
}

/** The zoom level that makes `contentSize` fit entirely inside `containerSize`, never enlarging past 100%. */
export function computeFitZoom(contentSize: Size, containerSize: Size): number {
  if (contentSize.width <= 0 || contentSize.height <= 0) return 1;
  const scale = Math.min(
    containerSize.width / contentSize.width,
    containerSize.height / contentSize.height,
  );
  return clamp(scale, MIN_ZOOM, 1);
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 4;

export function clampZoom(zoom: number): number {
  return clamp(zoom, MIN_ZOOM, MAX_ZOOM);
}

export function rotatePoint(
  point: Point,
  center: Point,
  angleDeg: number,
): Point {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/** Axis-aligned bounding box of a `width`x`height` rectangle centered at origin and rotated by `angleDeg`. */
export function rotatedBoundingSize(
  width: number,
  height: number,
  angleDeg: number,
): Size {
  const rad = (angleDeg * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return {
    width: width * cos + height * sin,
    height: width * sin + height * cos,
  };
}

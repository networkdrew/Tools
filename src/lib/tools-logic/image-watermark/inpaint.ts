import type { CloneOperation, RasterizedMask } from "./maskOps";

/** A raw RGBA pixel buffer — the same shape as `ImageData`, kept structural so tests don't need a DOM `ImageData`. */
export interface RGBAImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

/** Extra unmasked context (px) sampled around a masked region so the fill has real surrounding texture to draw from. */
const CONTEXT_MARGIN = 24;
/** Diffusion passes that relax the nearest-neighbor seed into a smoother gradient fill. */
const DIFFUSION_ITERATIONS = 12;

/**
 * Fills the masked region of `image` in place using its own surrounding
 * pixels: a multi-source BFS extrapolates the nearest unmasked color inward
 * (surrounding-pixel sampling), a handful of diffusion passes smooth that
 * seed into a natural gradient (lightweight texture synthesis), and the
 * result is feather-blended back against the original using the mask's
 * per-pixel weight. This is a fast, dependency-free approximation of
 * content-aware fill — it works well for small blemishes, text, and
 * watermarks over fairly uniform backgrounds, and less well for large areas
 * with complex repeating texture, which is why a manual clone-stamp
 * fallback (`applyCloneStamp`) also exists.
 */
export function applyContentAwareFill(
  image: RGBAImage,
  rasterized: RasterizedMask,
): void {
  const { bbox, mask } = rasterized;
  const rx0 = Math.max(0, bbox.x - CONTEXT_MARGIN);
  const ry0 = Math.max(0, bbox.y - CONTEXT_MARGIN);
  const rx1 = Math.min(image.width, bbox.x + bbox.width + CONTEXT_MARGIN);
  const ry1 = Math.min(image.height, bbox.y + bbox.height + CONTEXT_MARGIN);
  const rw = rx1 - rx0;
  const rh = ry1 - ry0;
  if (rw <= 0 || rh <= 0) return;

  const count = rw * rh;
  const weight = new Float32Array(count);
  for (let y = 0; y < bbox.height; y++) {
    const ry = bbox.y + y - ry0;
    if (ry < 0 || ry >= rh) continue;
    for (let x = 0; x < bbox.width; x++) {
      const rx = bbox.x + x - rx0;
      if (rx < 0 || rx >= rw) continue;
      const w = mask[y * bbox.width + x] ?? 0;
      if (w > 0) weight[ry * rw + rx] = w / 255;
    }
  }

  const r = new Float32Array(count);
  const g = new Float32Array(count);
  const b = new Float32Array(count);
  const a = new Float32Array(count);
  const isMasked = new Uint8Array(count);
  for (let y = 0; y < rh; y++) {
    for (let x = 0; x < rw; x++) {
      const idx = y * rw + x;
      const srcIdx = ((ry0 + y) * image.width + (rx0 + x)) * 4;
      r[idx] = image.data[srcIdx] ?? 0;
      g[idx] = image.data[srcIdx + 1] ?? 0;
      b[idx] = image.data[srcIdx + 2] ?? 0;
      a[idx] = image.data[srcIdx + 3] ?? 0;
      isMasked[idx] = (weight[idx] ?? 0) > 0 ? 1 : 0;
    }
  }

  seedNearestNeighbor(r, g, b, a, isMasked, rw, rh);
  diffuse(r, isMasked, rw, rh, DIFFUSION_ITERATIONS);
  diffuse(g, isMasked, rw, rh, DIFFUSION_ITERATIONS);
  diffuse(b, isMasked, rw, rh, DIFFUSION_ITERATIONS);
  diffuse(a, isMasked, rw, rh, DIFFUSION_ITERATIONS);

  for (let y = 0; y < bbox.height; y++) {
    const ry = bbox.y + y - ry0;
    if (ry < 0 || ry >= rh) continue;
    for (let x = 0; x < bbox.width; x++) {
      const rx = bbox.x + x - rx0;
      if (rx < 0 || rx >= rw) continue;
      const idx = ry * rw + rx;
      const w = weight[idx] ?? 0;
      if (w <= 0) continue;
      const destIdx = ((bbox.y + y) * image.width + (bbox.x + x)) * 4;
      const origR = image.data[destIdx] ?? 0;
      const origG = image.data[destIdx + 1] ?? 0;
      const origB = image.data[destIdx + 2] ?? 0;
      const origA = image.data[destIdx + 3] ?? 0;
      image.data[destIdx] = origR * (1 - w) + (r[idx] ?? 0) * w;
      image.data[destIdx + 1] = origG * (1 - w) + (g[idx] ?? 0) * w;
      image.data[destIdx + 2] = origB * (1 - w) + (b[idx] ?? 0) * w;
      image.data[destIdx + 3] = origA * (1 - w) + (a[idx] ?? 0) * w;
    }
  }
}

/** Multi-source BFS: every masked pixel is assigned the color reached along the shortest 4-connected path from an unmasked pixel. */
function seedNearestNeighbor(
  r: Float32Array,
  g: Float32Array,
  b: Float32Array,
  a: Float32Array,
  isMasked: Uint8Array,
  width: number,
  height: number,
): void {
  const visited = new Uint8Array(isMasked.length);
  const queue = new Int32Array(isMasked.length);
  let head = 0;
  let tail = 0;
  for (let i = 0; i < isMasked.length; i++) {
    if (!isMasked[i]) {
      visited[i] = 1;
      queue[tail++] = i;
    }
  }

  while (head < tail) {
    const idx = queue[head++] as number;
    const x = idx % width;
    const y = (idx - x) / width;
    const neighbors = [
      x > 0 ? idx - 1 : -1,
      x < width - 1 ? idx + 1 : -1,
      y > 0 ? idx - width : -1,
      y < height - 1 ? idx + width : -1,
    ];
    for (const n of neighbors) {
      if (n < 0 || visited[n]) continue;
      visited[n] = 1;
      r[n] = r[idx] as number;
      g[n] = g[idx] as number;
      b[n] = b[idx] as number;
      a[n] = a[idx] as number;
      queue[tail++] = n;
    }
  }
}

/** Averages each masked pixel with its unmasked-region neighbors over several passes, smoothing the flat BFS seed into a soft gradient. */
function diffuse(
  channel: Float32Array,
  isMasked: Uint8Array,
  width: number,
  height: number,
  iterations: number,
): void {
  let current: Float32Array = channel;
  let next: Float32Array = new Float32Array(channel.length);
  for (let iter = 0; iter < iterations; iter++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (!isMasked[idx]) {
          next[idx] = current[idx] as number;
          continue;
        }
        const left = x > 0 ? idx - 1 : idx;
        const right = x < width - 1 ? idx + 1 : idx;
        const up = y > 0 ? idx - width : idx;
        const down = y < height - 1 ? idx + width : idx;
        next[idx] =
          ((current[left] as number) +
            (current[right] as number) +
            (current[up] as number) +
            (current[down] as number)) /
          4;
      }
    }
    const swap = current;
    current = next;
    next = swap;
  }
  if (current !== channel) channel.set(current);
}

/**
 * Manual clone-stamp fallback: copies pixels from `point + sourceOffset` to
 * `point` for every masked pixel, feather-blended against the destination's
 * original color. Always available regardless of how well the automatic
 * fill handles a given image.
 */
export function applyCloneStamp(
  image: RGBAImage,
  op: CloneOperation,
  rasterized: RasterizedMask,
): void {
  const { bbox, mask } = rasterized;
  const dx = Math.round(op.sourceOffset.x * image.width);
  const dy = Math.round(op.sourceOffset.y * image.height);
  const snapshot = new Uint8ClampedArray(image.data);

  for (let y = 0; y < bbox.height; y++) {
    const iy = bbox.y + y;
    const sy = iy + dy;
    if (sy < 0 || sy >= image.height) continue;
    for (let x = 0; x < bbox.width; x++) {
      const w = (mask[y * bbox.width + x] ?? 0) / 255;
      if (w <= 0) continue;
      const ix = bbox.x + x;
      const sx = ix + dx;
      if (sx < 0 || sx >= image.width) continue;
      const destIdx = (iy * image.width + ix) * 4;
      const srcIdx = (sy * image.width + sx) * 4;
      for (let c = 0; c < 4; c++) {
        const orig = snapshot[destIdx + c] ?? 0;
        const src = snapshot[srcIdx + c] ?? 0;
        image.data[destIdx + c] = orig * (1 - w) + src * w;
      }
    }
  }
}

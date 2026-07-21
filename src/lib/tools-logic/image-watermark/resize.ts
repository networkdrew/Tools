/**
 * Dependency-free bilinear resampling for raw pixel buffers. Used to fit a
 * crop to an AI model's fixed input resolution and to resize its output
 * back down to the crop's native size — kept separate from any canvas API
 * so it works identically (and is testable) on the main thread or in a
 * worker, and regardless of which runtime resizes the surrounding crop.
 */

function sampleChannel(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  channels: number,
  channel: number,
  x: number,
  y: number,
): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, height - 1);
  const fx = x - x0;
  const fy = y - y0;

  const i00 = (y0 * width + x0) * channels + channel;
  const i10 = (y0 * width + x1) * channels + channel;
  const i01 = (y1 * width + x0) * channels + channel;
  const i11 = (y1 * width + x1) * channels + channel;

  const top = (data[i00] ?? 0) * (1 - fx) + (data[i10] ?? 0) * fx;
  const bottom = (data[i01] ?? 0) * (1 - fx) + (data[i11] ?? 0) * fx;
  return top * (1 - fy) + bottom * fy;
}

function resizeChannels(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  channels: number,
  targetWidth: number,
  targetHeight: number,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(targetWidth * targetHeight * channels);
  if (width <= 0 || height <= 0 || targetWidth <= 0 || targetHeight <= 0)
    return out;

  const scaleX = width / targetWidth;
  const scaleY = height / targetHeight;

  for (let ty = 0; ty < targetHeight; ty++) {
    const sy = Math.min(height - 1, (ty + 0.5) * scaleY - 0.5);
    const clampedSy = Math.max(0, sy);
    for (let tx = 0; tx < targetWidth; tx++) {
      const sx = Math.min(width - 1, (tx + 0.5) * scaleX - 0.5);
      const clampedSx = Math.max(0, sx);
      const outIdx = (ty * targetWidth + tx) * channels;
      for (let c = 0; c < channels; c++) {
        out[outIdx + c] = sampleChannel(
          data,
          width,
          height,
          channels,
          c,
          clampedSx,
          clampedSy,
        );
      }
    }
  }
  return out;
}

/** Resizes an interleaved RGB (3-channel) buffer. */
export function resizeRGB(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  targetWidth: number,
  targetHeight: number,
): Uint8ClampedArray {
  return resizeChannels(data, width, height, 3, targetWidth, targetHeight);
}

/** Resizes a single-channel (e.g. mask) buffer. */
export function resizeMask(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  targetWidth: number,
  targetHeight: number,
): Uint8ClampedArray {
  return resizeChannels(data, width, height, 1, targetWidth, targetHeight);
}

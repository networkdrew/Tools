import {
  orientedSize,
  type Rect,
  type Rotation,
  type Size,
} from "@/lib/tools-logic/image-crop/geometry";
import {
  computeCompositePlan,
  type FitMode,
} from "@/lib/tools-logic/image-crop/resize";
import type { OutputFormat } from "@/lib/tools-logic/image-crop/file";

export type DecodeResult =
  { ok: true; value: ImageBitmap } | { ok: false; message: string };

export async function decodeImageFile(file: File): Promise<DecodeResult> {
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    return { ok: true, value: bitmap };
  } catch {
    return {
      ok: false,
      message:
        "Couldn't read that image in this browser. Try a different file or a different browser.",
    };
  }
}

/** Scans the alpha channel for any non-opaque pixel. Defaults to false if canvas isn't available. */
export function detectTransparency(bitmap: ImageBitmap): boolean {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;

  ctx.drawImage(bitmap, 0, 0);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 255) return true;
  }
  return false;
}

/**
 * Draws `bitmap` onto a canvas of `canvasWidth` x `canvasHeight` (the
 * rotated dimensions, at whatever scale that size represents), applying
 * rotation and flip about the canvas center. The same math backs both the
 * downscaled interactive preview and the full-resolution export canvas, so a
 * crop rect measured against one is valid against the other after only a
 * uniform scale factor (see scaleRect in geometry.ts).
 */
function drawOrientedOnto(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  bitmap: ImageBitmap,
  rotation: Rotation,
  flipH: boolean,
  flipV: boolean,
): void {
  const native = orientedSize(
    { width: bitmap.width, height: bitmap.height },
    rotation,
  );
  const scale = native.width > 0 ? canvasWidth / native.width : 1;
  const drawWidth = bitmap.width * scale;
  const drawHeight = bitmap.height * scale;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.save();
  ctx.translate(canvasWidth / 2, canvasHeight / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
  ctx.drawImage(bitmap, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  ctx.restore();
}

/** Draws the oriented image onto a fresh, standalone canvas (used for full-resolution export). */
export function drawOriented(
  bitmap: ImageBitmap,
  outputSize: Size,
  rotation: Rotation,
  flipH: boolean,
  flipV: boolean,
): HTMLCanvasElement | null {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(outputSize.width));
  canvas.height = Math.max(1, Math.round(outputSize.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  drawOrientedOnto(
    ctx,
    canvas.width,
    canvas.height,
    bitmap,
    rotation,
    flipH,
    flipV,
  );
  return canvas;
}

/** Draws the oriented image onto an existing (e.g. on-screen) canvas element, resizing it to fit. */
export function drawOrientedToCanvas(
  canvas: HTMLCanvasElement,
  bitmap: ImageBitmap,
  outputSize: Size,
  rotation: Rotation,
  flipH: boolean,
  flipV: boolean,
): boolean {
  canvas.width = Math.max(1, Math.round(outputSize.width));
  canvas.height = Math.max(1, Math.round(outputSize.height));
  const ctx = canvas.getContext("2d");
  if (!ctx) return false;
  drawOrientedOnto(
    ctx,
    canvas.width,
    canvas.height,
    bitmap,
    rotation,
    flipH,
    flipV,
  );
  return true;
}

export interface ExportInput {
  bitmap: ImageBitmap;
  rotation: Rotation;
  flipH: boolean;
  flipV: boolean;
  /** In full-resolution, oriented (post-rotation) pixel coordinates. */
  cropRect: Rect;
  target: Size;
  fitMode: FitMode;
  allowUpscale: boolean;
  format: OutputFormat;
  /** 1-100, ignored for PNG. */
  quality: number;
}

export interface ExportOutput {
  blob: Blob;
  width: number;
  height: number;
}

export type ExportResult =
  { ok: true; value: ExportOutput } | { ok: false; message: string };

const CANVAS_UNSUPPORTED_MESSAGE =
  "Canvas isn't supported in this browser, so images can't be edited here.";

/** Full pipeline: orient (rotate/flip) at full resolution, crop, resize per the fit mode, and encode. */
export async function renderExport(input: ExportInput): Promise<ExportResult> {
  const native = orientedSize(
    { width: input.bitmap.width, height: input.bitmap.height },
    input.rotation,
  );
  const orientedCanvas = drawOriented(
    input.bitmap,
    native,
    input.rotation,
    input.flipH,
    input.flipV,
  );
  if (!orientedCanvas)
    return { ok: false, message: CANVAS_UNSUPPORTED_MESSAGE };

  const plan = computeCompositePlan(
    { width: input.cropRect.width, height: input.cropRect.height },
    input.target,
    input.fitMode,
    input.allowUpscale,
  );
  if (!plan.ok) return plan;

  const finalCanvas = document.createElement("canvas");
  finalCanvas.width = plan.value.canvasWidth;
  finalCanvas.height = plan.value.canvasHeight;
  const ctx = finalCanvas.getContext("2d");
  if (!ctx) return { ok: false, message: CANVAS_UNSUPPORTED_MESSAGE };

  if (input.format === "image/jpeg") {
    // JPEG has no alpha channel; without this, transparent pixels would
    // otherwise be composited onto black instead of a clean white fill.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  const sr = plan.value.sourceRect;
  ctx.drawImage(
    orientedCanvas,
    input.cropRect.x + sr.x,
    input.cropRect.y + sr.y,
    sr.width,
    sr.height,
    0,
    0,
    finalCanvas.width,
    finalCanvas.height,
  );

  const blob = await new Promise<Blob | null>((resolve) =>
    finalCanvas.toBlob(
      resolve,
      input.format,
      input.format === "image/png" ? undefined : input.quality / 100,
    ),
  );
  if (!blob) {
    return { ok: false, message: "Couldn't encode the image in this browser." };
  }

  return {
    ok: true,
    value: { blob, width: finalCanvas.width, height: finalCanvas.height },
  };
}

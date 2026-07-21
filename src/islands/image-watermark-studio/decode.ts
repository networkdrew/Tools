import type { Size } from "@/lib/tools-logic/image-watermark/geometry";

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

/** Draws a decoded bitmap into a fresh canvas at `size` and reads back the pixels. */
export function drawBitmapToImageData(
  bitmap: ImageBitmap,
  size: Size,
): ImageData | null {
  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  return ctx.getImageData(0, 0, size.width, size.height);
}

/** Builds a real `ImageData` from an RGBA buffer, copying into a fresh backing array so TypeScript's stricter typed-array generics (which reject a `SharedArrayBuffer`-compatible source) are satisfied. */
export function toImageData(image: {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}): ImageData {
  return new ImageData(
    Uint8ClampedArray.from(image.data),
    image.width,
    image.height,
  );
}

let idCounter = 0;

/** A short unique id for repair operations — no crypto dependency, so it works identically in every environment. */
export function generateOperationId(): string {
  idCounter += 1;
  return `op-${Date.now().toString(36)}-${idCounter}`;
}

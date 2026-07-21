import {
  computeSquareCrop,
  computeTileGrid,
} from "@/lib/tools-logic/image-watermark/aiCrop";
import { compositeCropIntoImage } from "@/lib/tools-logic/image-watermark/aiComposite";
import {
  extractCropMask,
  extractCropRGB,
} from "@/lib/tools-logic/image-watermark/cropExtract";
import type { RGBAImage } from "@/lib/tools-logic/image-watermark/inpaint";
import {
  buildLamaTensors,
  decodeLamaOutput,
} from "@/lib/tools-logic/image-watermark/lamaTensor";
import {
  boxBlurMask,
  rasterizeOperation,
  type RepairOperation,
} from "@/lib/tools-logic/image-watermark/maskOps";
import { dilateMask } from "@/lib/tools-logic/image-watermark/maskExpand";
import {
  resizeMask,
  resizeRGB,
} from "@/lib/tools-logic/image-watermark/resize";
import type { LoadedSession } from "@/islands/image-watermark-studio/aiModelLoader";

/** The model's fixed square input/output resolution. */
const MODEL_INPUT_SIZE = 512;
/** How far (in px, at the image's own resolution) the user's mask is grown before inference. */
const EXPAND_PX = 6;
/** Feather width (in px) applied after expansion, for a seamless blend back into the original. */
const FEATHER_PX = 8;
/** Selections larger than this (px, on the image's own resolution) are processed as multiple overlapping tiles. */
const MAX_TILE_SIZE = 640;
const TILE_OVERLAP = 96;

export interface AIRunProgress {
  instanceIndex: number;
  instanceCount: number;
  tileIndex: number;
  tileCount: number;
}

/**
 * Runs AI inpainting for each operation in `instances` against `image`,
 * returning a new image with all of them applied. Each instance is
 * processed independently (its own expand/feather, crop, and — for large
 * selections — tiles), so scattered or oversized selections don't force one
 * huge, quality-losing crop. Mutates nothing on `image`.
 */
export async function runAIInstances(
  image: RGBAImage,
  instances: RepairOperation[],
  loaded: LoadedSession,
  onProgress?: (progress: AIRunProgress) => void,
): Promise<RGBAImage> {
  const working: RGBAImage = {
    data: new Uint8ClampedArray(image.data),
    width: image.width,
    height: image.height,
  };

  for (
    let instanceIndex = 0;
    instanceIndex < instances.length;
    instanceIndex++
  ) {
    const op = instances[instanceIndex] as RepairOperation;
    const rasterized = rasterizeOperation(op, working.width, working.height);
    if (!rasterized) continue;

    dilateMask(
      rasterized.mask,
      rasterized.bbox.width,
      rasterized.bbox.height,
      EXPAND_PX,
    );
    boxBlurMask(
      rasterized.mask,
      rasterized.bbox.width,
      rasterized.bbox.height,
      FEATHER_PX,
      2,
    );

    const tiles = computeTileGrid(rasterized.bbox, MAX_TILE_SIZE, TILE_OVERLAP);

    for (let tileIndex = 0; tileIndex < tiles.length; tileIndex++) {
      const tileBBox = tiles[tileIndex] as (typeof tiles)[number];
      onProgress?.({
        instanceIndex,
        instanceCount: instances.length,
        tileIndex,
        tileCount: tiles.length,
      });

      const cropRect = computeSquareCrop(
        tileBBox,
        working.width,
        working.height,
      );
      const cropRGB = extractCropRGB(working, cropRect);
      const cropMask = extractCropMask(rasterized, cropRect);

      let hasWeight = false;
      for (let i = 0; i < cropMask.length; i++) {
        if ((cropMask[i] ?? 0) > 0) {
          hasWeight = true;
          break;
        }
      }
      if (!hasWeight) continue;

      const resizedRGB = resizeRGB(
        cropRGB,
        cropRect.width,
        cropRect.height,
        MODEL_INPUT_SIZE,
        MODEL_INPUT_SIZE,
      );
      const resizedMask = resizeMask(
        cropMask,
        cropRect.width,
        cropRect.height,
        MODEL_INPUT_SIZE,
        MODEL_INPUT_SIZE,
      );
      const { image: imageTensorData, mask: maskTensorData } = buildLamaTensors(
        resizedRGB,
        resizedMask,
        MODEL_INPUT_SIZE,
      );

      const { ort, session } = loaded;
      const results = await session.run({
        image: new ort.Tensor("float32", imageTensorData, [
          1,
          3,
          MODEL_INPUT_SIZE,
          MODEL_INPUT_SIZE,
        ]),
        mask: new ort.Tensor("float32", maskTensorData, [
          1,
          1,
          MODEL_INPUT_SIZE,
          MODEL_INPUT_SIZE,
        ]),
      });
      const outputName = session.outputNames[0] as string;
      const outputTensor = results[outputName];
      if (!outputTensor)
        throw new Error("The AI model didn't return an output tensor.");

      const decodedRGB = decodeLamaOutput(
        outputTensor.data as Float32Array,
        MODEL_INPUT_SIZE,
      );
      const resultAtCropRes = resizeRGB(
        decodedRGB,
        MODEL_INPUT_SIZE,
        MODEL_INPUT_SIZE,
        cropRect.width,
        cropRect.height,
      );

      compositeCropIntoImage(working, cropRect, resultAtCropRes, cropMask);
    }
  }

  return working;
}

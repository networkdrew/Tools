/**
 * Tensor construction/decoding for the LaMa inpainting ONNX graph
 * (Carve/LaMa-ONNX `lama_fp32.onnx`), isolated from the ONNX Runtime Web API
 * itself so it's testable with plain arrays. Conventions here were verified
 * empirically against the actual model (see the model-comparison writeup):
 *
 * - "image" input: float32 NCHW, values 0..1, with the hole region
 *   pre-blanked to 0 (the network was trained on erased input, not the
 *   original content — feeding it unblanked lets it "cheat" by copying the
 *   watermark straight through).
 * - "mask" input: float32 NCHW, single channel, 1 = hole (repaint), 0 = known.
 * - "output": float32 NCHW, already in 0..255 range (unlike the PyTorch
 *   model, which outputs 0..1) — no extra *255 scaling.
 */

export interface LamaTensors {
  image: Float32Array;
  mask: Float32Array;
}

/**
 * Builds the two input tensors from an RGB crop and its mask, both already
 * resized to `size`x`size` (the model's fixed square input resolution).
 * `maskWeight` is a 0..255 feathered/expanded weight; values above
 * `holeThreshold` are treated as hole.
 */
export function buildLamaTensors(
  rgb: Uint8ClampedArray,
  maskWeight: Uint8ClampedArray,
  size: number,
  holeThreshold = 127,
): LamaTensors {
  const plane = size * size;
  const image = new Float32Array(3 * plane);
  const mask = new Float32Array(plane);

  for (let i = 0; i < plane; i++) {
    const isHole = (maskWeight[i] ?? 0) > holeThreshold;
    mask[i] = isHole ? 1 : 0;
    const keep = isHole ? 0 : 1;
    image[i] = ((rgb[i * 3] ?? 0) / 255) * keep;
    image[plane + i] = ((rgb[i * 3 + 1] ?? 0) / 255) * keep;
    image[2 * plane + i] = ((rgb[i * 3 + 2] ?? 0) / 255) * keep;
  }

  return { image, mask };
}

/** Converts the model's NCHW float32 output (0..255 range) to an interleaved RGB buffer. */
export function decodeLamaOutput(
  output: Float32Array,
  size: number,
): Uint8ClampedArray {
  const plane = size * size;
  const rgb = new Uint8ClampedArray(plane * 3);
  for (let i = 0; i < plane; i++) {
    rgb[i * 3] = output[i] ?? 0;
    rgb[i * 3 + 1] = output[plane + i] ?? 0;
    rgb[i * 3 + 2] = output[2 * plane + i] ?? 0;
  }
  return rgb;
}

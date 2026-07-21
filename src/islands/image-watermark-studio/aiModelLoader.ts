/**
 * Downloads and initializes the LaMa inpainting ONNX model + ONNX Runtime
 * Web on demand — nothing here is imported by the rest of the app until AI
 * removal mode is actually activated, so it never loads at normal page
 * startup (verified in the production bundle — see docs on this tool).
 *
 * The model (~198 MB, Carve/LaMa-ONNX `lama_fp32.onnx`, Apache-2.0) and the
 * ONNX Runtime Web WASM binary (~26 MB) both exceed Cloudflare Workers'
 * 25 MiB per-static-asset limit, so they can't be self-hosted in this
 * project's `public/` directory. They're fetched from their original public
 * CDNs (Hugging Face and jsDelivr) instead — the same approach used by
 * every comparable browser-based inpainting tool. Only the small ONNX
 * Runtime Web JS glue is bundled with the app itself.
 */

export const ORT_VERSION = "1.27.0";
export const MODEL_URL =
  "https://huggingface.co/Carve/LaMa-ONNX/resolve/main/lama_fp32.onnx";
/** Known size of the pinned model file, used to show a size estimate before any request is made. */
export const MODEL_APPROX_BYTES = 208_044_816;
export const MODEL_LICENSE = "Apache-2.0 (LaMa / Carve/LaMa-ONNX)";

const MODEL_CACHE_NAME = "opentoolbox-ai-inpaint-model-v1";

export type Backend = "webgpu" | "wasm";

export interface DownloadProgress {
  loadedBytes: number;
  totalBytes: number;
  /** True once bytes came from the local cache instead of the network. */
  fromCache: boolean;
}

/** Feature-detects WebGPU without actually creating a session. */
export async function isWebGPUSupported(): Promise<boolean> {
  const gpu = (
    navigator as unknown as { gpu?: { requestAdapter(): Promise<unknown> } }
  ).gpu;
  if (!gpu) return false;
  try {
    const adapter = await gpu.requestAdapter();
    return !!adapter;
  } catch {
    return false;
  }
}

/** A loose, best-effort signal for very low-memory devices; not available in every browser. */
export function hasLowDeviceMemory(): boolean {
  const deviceMemory = (navigator as unknown as { deviceMemory?: number })
    .deviceMemory;
  return (
    typeof deviceMemory === "number" && deviceMemory > 0 && deviceMemory < 4
  );
}

async function readCachedModel(): Promise<ArrayBuffer | null> {
  if (!("caches" in window)) return null;
  try {
    const cache = await caches.open(MODEL_CACHE_NAME);
    const cached = await cache.match(MODEL_URL);
    if (!cached) return null;
    return await cached.arrayBuffer();
  } catch {
    return null;
  }
}

async function writeCachedModel(blob: Blob): Promise<void> {
  if (!("caches" in window)) return;
  try {
    const cache = await caches.open(MODEL_CACHE_NAME);
    await cache.put(
      MODEL_URL,
      new Response(blob, {
        headers: { "Content-Type": "application/octet-stream" },
      }),
    );
  } catch {
    // Best-effort only -- caching failures (e.g. quota, private browsing) shouldn't block inference.
  }
}

/** Downloads the model (or reads it from the local cache), reporting byte progress along the way. */
export async function fetchModelBytes(
  onProgress: (progress: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  const cached = await readCachedModel();
  if (cached) {
    onProgress({
      loadedBytes: cached.byteLength,
      totalBytes: cached.byteLength,
      fromCache: true,
    });
    return cached;
  }

  const response = await fetch(MODEL_URL, { signal });
  if (!response.ok || !response.body) {
    throw new Error(
      `Couldn't download the AI model (HTTP ${response.status}).`,
    );
  }
  const totalBytes =
    Number(response.headers.get("content-length")) || MODEL_APPROX_BYTES;

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loadedBytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loadedBytes += value.byteLength;
    onProgress({ loadedBytes, totalBytes, fromCache: false });
  }

  const blob = new Blob(chunks.map((c) => c as unknown as BlobPart));
  void writeCachedModel(blob);
  return blob.arrayBuffer();
}

export interface LoadedSession {
  session: import("onnxruntime-web").InferenceSession;
  ort: typeof import("onnxruntime-web");
  backend: Backend;
}

/**
 * ONNX Runtime Web ships several WASM binaries for different backends (plain
 * WASM, WebGPU/JSEP, an "asyncify" WASM-fallback used internally by the JSEP
 * build, ...); each is only reachable through the matching JS entry point
 * (`onnxruntime-web/webgpu` vs `onnxruntime-web/wasm`), and each entry point
 * resolves its own `.wasm` (and companion `.mjs`) file relative to
 * `wasmPaths`. Passing `wasmPaths` as a directory prefix (rather than a
 * single filename override) lets the runtime resolve whichever variant it
 * actually needs for the requested execution provider.
 */
const WASM_PATH_PREFIX = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;

/** Creates an inference session from already-downloaded model bytes, preferring WebGPU and falling back to WASM. */
export async function createInpaintSession(
  modelBytes: ArrayBuffer,
): Promise<LoadedSession> {
  if (await isWebGPUSupported()) {
    try {
      const ort = await import("onnxruntime-web/webgpu");
      // Avoid requiring cross-origin-isolation (COOP/COEP) site-wide just for this one tool.
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.wasmPaths = WASM_PATH_PREFIX;
      const session = await ort.InferenceSession.create(modelBytes, {
        executionProviders: ["webgpu"],
        graphOptimizationLevel: "all",
      });
      return { session, ort, backend: "webgpu" };
    } catch {
      // Fall through to WASM -- some browsers report navigator.gpu but still fail on specific graphs/ops.
    }
  }

  const ort = await import("onnxruntime-web/wasm");
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmPaths = WASM_PATH_PREFIX;
  const session = await ort.InferenceSession.create(modelBytes, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
  return { session, ort, backend: "wasm" };
}

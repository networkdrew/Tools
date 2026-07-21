import { describe, expect, it, vi } from "vitest";
import { runAIInstances } from "./aiRunner";
import type { RGBAImage } from "@/lib/tools-logic/image-watermark/inpaint";
import type { RepairOperation } from "@/lib/tools-logic/image-watermark/maskOps";
import type { LoadedSession } from "./aiModelLoader";

const MODEL_SIZE = 512;

class FakeTensor {
  type: string;
  data: Float32Array;
  dims: number[];
  constructor(type: string, data: Float32Array, dims: number[]) {
    this.type = type;
    this.data = data;
    this.dims = dims;
  }
}

function solidImage(
  width: number,
  height: number,
  r: number,
  g: number,
  b: number,
): RGBAImage {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }
  return { data, width, height };
}

/** A fake session whose "model" just returns a solid fill color, so we can verify compositing without real inference. */
function makeFakeSession(fillColor: [number, number, number]) {
  const plane = MODEL_SIZE * MODEL_SIZE;
  const run = vi.fn(async () => {
    const output = new Float32Array(3 * plane);
    output.fill(fillColor[0], 0, plane);
    output.fill(fillColor[1], plane, 2 * plane);
    output.fill(fillColor[2], 2 * plane, 3 * plane);
    return {
      output: new FakeTensor("float32", output, [1, 3, MODEL_SIZE, MODEL_SIZE]),
    };
  });
  const session = {
    run,
    outputNames: ["output"],
  } as unknown as LoadedSession["session"];
  const ort = { Tensor: FakeTensor } as unknown as LoadedSession["ort"];
  return { loaded: { session, ort, backend: "wasm" as const }, run };
}

describe("runAIInstances", () => {
  it("runs inference once for a small, single-region instance and composites the result", async () => {
    const image = solidImage(200, 200, 10, 10, 10);
    const { loaded, run } = makeFakeSession([220, 30, 30]);
    const op: RepairOperation = {
      id: "1",
      kind: "brush",
      points: [{ x: 0.5, y: 0.5 }],
      radius: 0.1,
      feather: 0.02,
    };

    const result = await runAIInstances(image, [op], loaded);

    expect(run).toHaveBeenCalledTimes(1);
    const centerIdx = (100 * 200 + 100) * 4;
    expect(result.data[centerIdx]).toBeGreaterThan(150); // pulled toward the fill color
    // untouched corner should be unchanged
    expect(result.data[0]).toBe(10);
  });

  it("does not mutate the input image", async () => {
    const image = solidImage(100, 100, 5, 5, 5);
    const original = Uint8ClampedArray.from(image.data);
    const { loaded } = makeFakeSession([250, 250, 250]);
    const op: RepairOperation = {
      id: "1",
      kind: "box",
      rect: { x: 0.3, y: 0.3, width: 0.2, height: 0.2 },
      feather: 0.02,
    };
    await runAIInstances(image, [op], loaded);
    expect(image.data).toEqual(original);
  });

  it("splits a large selection into multiple tiles and runs inference per tile", async () => {
    const image = solidImage(2000, 800, 40, 40, 40);
    const { loaded, run } = makeFakeSession([200, 200, 200]);
    const op: RepairOperation = {
      id: "1",
      kind: "box",
      rect: { x: 0.02, y: 0.05, width: 0.9, height: 0.8 },
      feather: 0.01,
    };
    await runAIInstances(image, [op], loaded);
    expect(run.mock.calls.length).toBeGreaterThan(1);
  });

  it("processes multiple instances independently, each with its own inference call(s)", async () => {
    const image = solidImage(300, 300, 0, 0, 0);
    const { loaded, run } = makeFakeSession([255, 255, 255]);
    const ops: RepairOperation[] = [
      {
        id: "1",
        kind: "brush",
        points: [{ x: 0.2, y: 0.2 }],
        radius: 0.05,
        feather: 0.01,
      },
      {
        id: "2",
        kind: "brush",
        points: [{ x: 0.8, y: 0.8 }],
        radius: 0.05,
        feather: 0.01,
      },
    ];
    await runAIInstances(image, ops, loaded);
    expect(run).toHaveBeenCalledTimes(2);
  });

  it("skips an instance that rasterizes to nothing (e.g. empty points)", async () => {
    const image = solidImage(50, 50, 1, 1, 1);
    const { loaded, run } = makeFakeSession([100, 100, 100]);
    const op: RepairOperation = {
      id: "1",
      kind: "brush",
      points: [],
      radius: 0.1,
      feather: 0.01,
    };
    await expect(runAIInstances(image, [op], loaded)).resolves.toBeTruthy();
    expect(run).not.toHaveBeenCalled();
  });

  it("reports progress for each tile processed", async () => {
    const image = solidImage(200, 200, 10, 10, 10);
    const { loaded } = makeFakeSession([200, 50, 50]);
    const op: RepairOperation = {
      id: "1",
      kind: "brush",
      points: [{ x: 0.5, y: 0.5 }],
      radius: 0.1,
      feather: 0.02,
    };
    const progressUpdates: { instanceIndex: number; tileIndex: number }[] = [];
    await runAIInstances(image, [op], loaded, (p) =>
      progressUpdates.push({
        instanceIndex: p.instanceIndex,
        tileIndex: p.tileIndex,
      }),
    );
    expect(progressUpdates).toEqual([{ instanceIndex: 0, tileIndex: 0 }]);
  });
});

import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { buildManyPdfs, buildPdf } from "./extract";

async function makeSamplePdf(pageSizes: [number, number][]) {
  const doc = await PDFDocument.create();
  for (const [w, h] of pageSizes) doc.addPage([w, h]);
  return doc;
}

describe("buildPdf", () => {
  it("copies the requested pages in the given order", async () => {
    const source = await makeSamplePdf([
      [100, 100],
      [200, 200],
      [300, 300],
    ]);

    const result = await buildPdf(source, [3, 1], new Map());
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const output = await PDFDocument.load(result.value);
    expect(output.getPageCount()).toBe(2);
    expect(output.getPage(0).getWidth()).toBe(300);
    expect(output.getPage(1).getWidth()).toBe(100);
  });

  it("applies extra rotation on top of the original rotation", async () => {
    const source = await makeSamplePdf([[100, 100]]);

    const result = await buildPdf(source, [1], new Map([[1, 90]]));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const output = await PDFDocument.load(result.value);
    expect(output.getPage(0).getRotation().angle).toBe(90);
  });

  it("rejects an empty page selection", async () => {
    const source = await makeSamplePdf([[100, 100]]);
    const result = await buildPdf(source, [], new Map());
    expect(result.ok).toBe(false);
  });
});

describe("buildManyPdfs", () => {
  it("builds one PDF per group and reports progress", async () => {
    const source = await makeSamplePdf([
      [100, 100],
      [200, 200],
      [300, 300],
      [400, 400],
    ]);

    const progressUpdates: number[] = [];
    const result = await buildManyPdfs(
      source,
      [[1], [2], [3], [4]],
      new Map(),
      (index) => `page-${index}.pdf`,
      { onProgress: (p) => progressUpdates.push(p.completed) },
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.map((f) => f.name)).toEqual([
      "page-1.pdf",
      "page-2.pdf",
      "page-3.pdf",
      "page-4.pdf",
    ]);
    expect(progressUpdates).toEqual([1, 2, 3, 4]);

    const firstOutput = await PDFDocument.load(result.value[0]!.bytes);
    expect(firstOutput.getPageCount()).toBe(1);
    expect(firstOutput.getPage(0).getWidth()).toBe(100);
  });

  it("stops early and reports cancellation", async () => {
    const source = await makeSamplePdf([
      [100, 100],
      [200, 200],
    ]);
    let calls = 0;

    const result = await buildManyPdfs(
      source,
      [[1], [2]],
      new Map(),
      (index) => `page-${index}.pdf`,
      {
        shouldCancel: () => {
          calls++;
          return calls > 1;
        },
      },
    );

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.cancelled).toBe(true);
  });

  it("rejects an empty group list", async () => {
    const source = await makeSamplePdf([[100, 100]]);
    const result = await buildManyPdfs(
      source,
      [],
      new Map(),
      (i) => `${i}.pdf`,
    );
    expect(result.ok).toBe(false);
  });
});

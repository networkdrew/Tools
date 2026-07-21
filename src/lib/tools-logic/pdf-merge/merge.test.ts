import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { mergePdfs } from "./merge";
import type { FlattenedPage } from "./pages";

async function makeDoc(pageSizes: [number, number][]) {
  const doc = await PDFDocument.create();
  for (const [w, h] of pageSizes) doc.addPage([w, h]);
  return doc;
}

function entry(
  groupId: string,
  id: string,
  sourcePageIndex: number,
  rotation = 0,
): FlattenedPage {
  return { groupId, page: { id, sourcePageIndex, rotation } };
}

describe("mergePdfs", () => {
  it("errors when there are no pages to merge", async () => {
    const result = await mergePdfs([], new Map());
    expect(result.ok).toBe(false);
  });

  it("merges pages from multiple sources in the requested order", async () => {
    const docA = await makeDoc([
      [100, 100],
      [150, 150],
    ]);
    const docB = await makeDoc([[300, 300]]);
    const sources = new Map([
      ["a", docA],
      ["b", docB],
    ]);

    // Interleaved / reordered: b's page, then a's second page, then a's first.
    const entries: FlattenedPage[] = [
      entry("b", "b:0", 0),
      entry("a", "a:1", 1),
      entry("a", "a:0", 0),
    ];

    const result = await mergePdfs(entries, sources);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const output = await PDFDocument.load(result.value);
    expect(output.getPageCount()).toBe(3);
    const widths = output.getPages().map((p) => p.getWidth());
    expect(widths).toEqual([300, 150, 100]);
  });

  it("excludes removed pages", async () => {
    const docA = await makeDoc([
      [100, 100],
      [150, 150],
      [200, 200],
    ]);
    const sources = new Map([["a", docA]]);
    // Only pages 0 and 2 included — page 1 was "removed".
    const entries: FlattenedPage[] = [
      entry("a", "a:0", 0),
      entry("a", "a:2", 2),
    ];

    const result = await mergePdfs(entries, sources);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const output = await PDFDocument.load(result.value);
    expect(output.getPageCount()).toBe(2);
    expect(output.getPages().map((p) => p.getWidth())).toEqual([100, 200]);
  });

  it("applies a rotation delta on top of the original page rotation", async () => {
    const docA = await makeDoc([[100, 200]]);
    const sources = new Map([["a", docA]]);
    const entries: FlattenedPage[] = [entry("a", "a:0", 0, 90)];

    const result = await mergePdfs(entries, sources);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const output = await PDFDocument.load(result.value);
    expect(output.getPages()[0]?.getRotation().angle).toBe(90);
  });

  it("reports progress once per page", async () => {
    const docA = await makeDoc([
      [100, 100],
      [100, 100],
      [100, 100],
    ]);
    const sources = new Map([["a", docA]]);
    const entries: FlattenedPage[] = [
      entry("a", "a:0", 0),
      entry("a", "a:1", 1),
      entry("a", "a:2", 2),
    ];

    const progressUpdates: { completed: number; total: number }[] = [];
    await mergePdfs(entries, sources, {
      onProgress: (p) => progressUpdates.push(p),
    });

    expect(progressUpdates).toEqual([
      { completed: 1, total: 3 },
      { completed: 2, total: 3 },
      { completed: 3, total: 3 },
    ]);
  });

  it("stops and reports cancellation between pages", async () => {
    const docA = await makeDoc([
      [100, 100],
      [100, 100],
      [100, 100],
    ]);
    const sources = new Map([["a", docA]]);
    const entries: FlattenedPage[] = [
      entry("a", "a:0", 0),
      entry("a", "a:1", 1),
      entry("a", "a:2", 2),
    ];

    let completed = 0;
    const result = await mergePdfs(entries, sources, {
      onProgress: () => {
        completed++;
      },
      shouldCancel: () => completed >= 1,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.cancelled).toBe(true);
    expect(completed).toBe(1);
  });

  it("errors clearly if a referenced source document is missing", async () => {
    const entries: FlattenedPage[] = [entry("missing", "missing:0", 0)];
    const result = await mergePdfs(entries, new Map());
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/missing/i);
  });
});

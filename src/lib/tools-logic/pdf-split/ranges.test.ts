import { describe, expect, it } from "vitest";
import {
  chunkPages,
  complementPages,
  everyPageSeparately,
  normalizeRotation,
  parsePageRanges,
  parseRangeGroups,
} from "./ranges";

describe("parsePageRanges", () => {
  it("parses a mix of single pages and ranges in ascending order", () => {
    const result = parsePageRanges("1-3, 6, 9-12", 12);
    expect(result).toEqual({ ok: true, value: [1, 2, 3, 6, 9, 10, 11, 12] });
  });

  it("dedupes tokens that are out of written order but sorts the output", () => {
    const result = parsePageRanges("9-10, 1", 10);
    expect(result).toEqual({ ok: true, value: [1, 9, 10] });
  });

  it("tolerates extra whitespace around tokens and dashes", () => {
    const result = parsePageRanges(" 1 - 2 ,  4 ", 5);
    expect(result).toEqual({ ok: true, value: [1, 2, 4] });
  });

  it("rejects empty input", () => {
    const result = parsePageRanges("", 10);
    expect(result.ok).toBe(false);
  });

  it("rejects whitespace-only input", () => {
    const result = parsePageRanges("   ", 10);
    expect(result.ok).toBe(false);
  });

  it("rejects malformed tokens", () => {
    const result = parsePageRanges("1-2-3", 10);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/valid page number/);
  });

  it("rejects non-numeric tokens", () => {
    const result = parsePageRanges("abc", 10);
    expect(result.ok).toBe(false);
  });

  it("rejects a range where the start comes after the end", () => {
    const result = parsePageRanges("5-3", 10);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.message).toMatch(/start page must come before/);
  });

  it("rejects page 0", () => {
    const result = parsePageRanges("0-2", 10);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/out of range/);
  });

  it("rejects a page number beyond the document's page count", () => {
    const result = parsePageRanges("1-20", 10);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/out of range/);
  });

  it("rejects a duplicate page across two tokens", () => {
    const result = parsePageRanges("1-3, 2", 10);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/more than once/);
  });

  it("rejects a duplicate page within a single range and a single token", () => {
    const result = parsePageRanges("1-3, 1-3", 10);
    expect(result.ok).toBe(false);
  });
});

describe("parseRangeGroups", () => {
  it("parses one group per non-empty line", () => {
    const result = parseRangeGroups("1-3\n4-6\n7-10", 10);
    expect(result).toEqual({
      ok: true,
      value: [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9, 10],
      ],
    });
  });

  it("skips blank lines", () => {
    const result = parseRangeGroups("1-2\n\n3-4\n", 4);
    expect(result).toEqual({
      ok: true,
      value: [
        [1, 2],
        [3, 4],
      ],
    });
  });

  it("allows the same page to appear in more than one group", () => {
    const result = parseRangeGroups("1-2\n2-3", 3);
    expect(result).toEqual({
      ok: true,
      value: [
        [1, 2],
        [2, 3],
      ],
    });
  });

  it("rejects a duplicate page within a single line", () => {
    const result = parseRangeGroups("1-2, 2", 3);
    expect(result.ok).toBe(false);
  });

  it("rejects empty input", () => {
    const result = parseRangeGroups("", 10);
    expect(result.ok).toBe(false);
  });

  it("reports which line an error is on", () => {
    const result = parseRangeGroups("1-2\n99", 3);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message).toMatch(/^Line 2:/);
  });
});

describe("chunkPages", () => {
  it("splits pages into consecutive fixed-size chunks", () => {
    expect(chunkPages(7, 3)).toEqual([[1, 2, 3], [4, 5, 6], [7]]);
  });

  it("returns one chunk when the size is larger than the page count", () => {
    expect(chunkPages(3, 10)).toEqual([[1, 2, 3]]);
  });

  it("returns an empty array for a non-positive chunk size", () => {
    expect(chunkPages(5, 0)).toEqual([]);
  });
});

describe("everyPageSeparately", () => {
  it("returns one single-page group per page", () => {
    expect(everyPageSeparately(3)).toEqual([[1], [2], [3]]);
  });
});

describe("complementPages", () => {
  it("returns pages not in the selected set, in ascending order", () => {
    expect(complementPages(5, new Set([2, 4]))).toEqual([1, 3, 5]);
  });

  it("returns all pages when nothing is selected", () => {
    expect(complementPages(3, new Set())).toEqual([1, 2, 3]);
  });

  it("returns no pages when everything is selected", () => {
    expect(complementPages(3, new Set([1, 2, 3]))).toEqual([]);
  });
});

describe("normalizeRotation", () => {
  it("wraps positive and negative degrees into [0, 360)", () => {
    expect(normalizeRotation(90)).toBe(90);
    expect(normalizeRotation(-90)).toBe(270);
    expect(normalizeRotation(450)).toBe(90);
    expect(normalizeRotation(360)).toBe(0);
  });
});

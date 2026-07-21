import { describe, expect, it } from "vitest";
import {
  formatJson,
  minifyJson,
  offsetToLineColumn,
  validateJson,
} from "./format";

describe("offsetToLineColumn", () => {
  it("finds the first line and column", () => {
    expect(offsetToLineColumn("abc", 0)).toEqual({ line: 1, column: 1 });
  });

  it("counts across newlines", () => {
    expect(offsetToLineColumn("ab\ncd\nef", 6)).toEqual({ line: 3, column: 1 });
  });

  it("counts columns after a newline", () => {
    expect(offsetToLineColumn("ab\ncdef", 5)).toEqual({ line: 2, column: 3 });
  });
});

describe("formatJson", () => {
  it("pretty-prints valid JSON with 2-space indent", () => {
    const result = formatJson('{"a":1,"b":[1,2,3]}');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(
        '{\n  "a": 1,\n  "b": [\n    1,\n    2,\n    3\n  ]\n}',
      );
    }
  });

  it("supports a custom indent size", () => {
    const result = formatJson('{"a":1}', 4);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('{\n    "a": 1\n}');
  });

  it("rejects empty input", () => {
    const result = formatJson("   ");
    expect(result.ok).toBe(false);
  });

  it("reports a line and column for malformed JSON", () => {
    // Missing comma between properties, on line 3.
    const result = formatJson('{\n  "a": 1\n  "b": 2\n}');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.line).toBe(3);
      expect(result.column).toBeGreaterThanOrEqual(1);
    }
  });

  it("rejects trailing commas", () => {
    const result = formatJson('{"a":1,}');
    expect(result.ok).toBe(false);
  });

  it("rejects single-quoted strings", () => {
    const result = formatJson("{'a':1}");
    expect(result.ok).toBe(false);
  });

  it("handles top-level primitives", () => {
    const result = formatJson("42");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("42");
  });
});

describe("minifyJson", () => {
  it("removes all non-essential whitespace", () => {
    const result = minifyJson('{\n  "a": 1,\n  "b": [1, 2]\n}');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('{"a":1,"b":[1,2]}');
  });

  it("rejects malformed JSON", () => {
    const result = minifyJson("{a:1}");
    expect(result.ok).toBe(false);
  });
});

describe("validateJson", () => {
  it("accepts valid JSON without modifying it", () => {
    const result = validateJson('{"a":1}');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe('{"a":1}');
  });

  it("rejects invalid JSON with a message", () => {
    const result = validateJson("{");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.message.length).toBeGreaterThan(0);
  });
});

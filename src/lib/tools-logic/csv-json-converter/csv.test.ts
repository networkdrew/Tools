import { describe, expect, it } from "vitest";
import { parseCsv, stringifyCsv } from "./csv";

describe("parseCsv", () => {
  it("parses simple comma-separated rows", () => {
    expect(parseCsv("a,b,c\n1,2,3", ",")).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("handles quoted fields containing the delimiter", () => {
    expect(parseCsv('name,note\nAda,"hello, world"', ",")).toEqual([
      ["name", "note"],
      ["Ada", "hello, world"],
    ]);
  });

  it("handles escaped double quotes inside quoted fields", () => {
    expect(parseCsv('a\n"She said ""hi"""', ",")).toEqual([
      ["a"],
      ['She said "hi"'],
    ]);
  });

  it("handles quoted fields containing newlines", () => {
    expect(parseCsv('a\n"line one\nline two"', ",")).toEqual([
      ["a"],
      ["line one\nline two"],
    ]);
  });

  it("handles CRLF line endings", () => {
    expect(parseCsv("a,b\r\n1,2\r\n", ",")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("respects a custom delimiter", () => {
    expect(parseCsv("a;b\n1;2", ";")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("ignores blank lines", () => {
    expect(parseCsv("a,b\n\n1,2\n", ",")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseCsv("", ",")).toEqual([]);
  });

  it("throws on an unterminated quoted field", () => {
    expect(() => parseCsv('a\n"unterminated', ",")).toThrow();
  });
});

describe("stringifyCsv", () => {
  it("joins fields and rows with the given delimiter", () => {
    expect(
      stringifyCsv(
        [
          ["a", "b"],
          ["1", "2"],
        ],
        ",",
      ),
    ).toBe("a,b\n1,2");
  });

  it("quotes fields containing the delimiter, quotes, or newlines", () => {
    expect(stringifyCsv([['He said "hi", twice']], ",")).toBe(
      '"He said ""hi"", twice"',
    );
  });

  it("round-trips through parseCsv", () => {
    const rows = [
      ["name", "note"],
      ["Ada", 'quote " comma , newline\nhere'],
    ];
    const csv = stringifyCsv(rows, ",");
    expect(parseCsv(csv, ",")).toEqual(rows);
  });
});

import { describe, expect, it } from "vitest";
import {
  collapseBlankLines,
  collapseSpaces,
  removeLineBreaks,
  toLowerCase,
  toTitleCase,
  toUpperCase,
  trimLines,
} from "./cleanup";

describe("trimLines", () => {
  it("trims leading and trailing whitespace on every line", () => {
    expect(trimLines("  hello  \n  world  ")).toBe("hello\nworld");
  });
});

describe("collapseSpaces", () => {
  it("collapses runs of spaces and tabs to one space", () => {
    expect(collapseSpaces("a   b\t\tc")).toBe("a b c");
  });

  it("does not collapse across line breaks", () => {
    expect(collapseSpaces("a  b\nc  d")).toBe("a b\nc d");
  });
});

describe("collapseBlankLines", () => {
  it("collapses 3+ blank lines to a single blank line", () => {
    expect(collapseBlankLines("a\n\n\n\n\nb")).toBe("a\n\nb");
  });

  it("leaves a single blank line alone", () => {
    expect(collapseBlankLines("a\n\nb")).toBe("a\n\nb");
  });
});

describe("removeLineBreaks", () => {
  it("joins non-empty lines with a single space", () => {
    expect(removeLineBreaks("line one\nline two\n\nline three")).toBe(
      "line one line two line three",
    );
  });
});

describe("case transforms", () => {
  it("uppercases text", () => {
    expect(toUpperCase("Hello World")).toBe("HELLO WORLD");
  });

  it("lowercases text", () => {
    expect(toLowerCase("Hello World")).toBe("hello world");
  });

  it("title-cases each word", () => {
    expect(toTitleCase("the quick BROWN fox")).toBe("The Quick Brown Fox");
  });
});

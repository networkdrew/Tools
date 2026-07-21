import { describe, expect, it } from "vitest";
import { computeTextStats } from "./stats";

describe("computeTextStats", () => {
  it("returns all zeros for empty input", () => {
    expect(computeTextStats("")).toEqual({
      characters: 0,
      charactersNoSpaces: 0,
      words: 0,
      sentences: 0,
      paragraphs: 0,
      lines: 0,
      readingTimeMinutes: 0,
    });
  });

  it("counts words, characters, and sentences in a simple sentence", () => {
    const stats = computeTextStats("Hello world. How are you?");
    expect(stats.words).toBe(5);
    expect(stats.sentences).toBe(2);
    expect(stats.characters).toBe(25);
  });

  it("counts characters without spaces separately", () => {
    const stats = computeTextStats("a b c");
    expect(stats.characters).toBe(5);
    expect(stats.charactersNoSpaces).toBe(3);
  });

  it("counts paragraphs separated by blank lines", () => {
    const stats = computeTextStats(
      "First paragraph.\n\nSecond paragraph.\n\nThird.",
    );
    expect(stats.paragraphs).toBe(3);
  });

  it("counts lines including blank ones", () => {
    const stats = computeTextStats("line one\nline two\n\nline four");
    expect(stats.lines).toBe(4);
  });

  it("estimates at least one minute of reading time for any non-empty text", () => {
    const stats = computeTextStats("just a few words");
    expect(stats.readingTimeMinutes).toBe(1);
  });

  it("scales reading time with word count", () => {
    const words = Array.from({ length: 450 }, () => "word").join(" ");
    const stats = computeTextStats(words);
    expect(stats.readingTimeMinutes).toBe(3);
  });

  it("handles unicode text (emoji, accents) without throwing", () => {
    const stats = computeTextStats("Café résumé 🎉 test");
    expect(stats.words).toBe(4);
    expect(stats.characters).toBeGreaterThan(0);
  });
});

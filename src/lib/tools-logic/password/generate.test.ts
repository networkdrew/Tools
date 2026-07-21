import { describe, expect, it } from "vitest";
import {
  generatePassphrase,
  generatePassword,
  strengthLabel,
} from "./generate";
import { secureRandomInt, secureShuffle } from "./random";

describe("secureRandomInt", () => {
  it("stays within [0, max)", () => {
    for (let i = 0; i < 500; i++) {
      const value = secureRandomInt(7);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(7);
    }
  });

  it("rejects non-positive or non-integer max", () => {
    expect(() => secureRandomInt(0)).toThrow();
    expect(() => secureRandomInt(1.5)).toThrow();
  });
});

describe("secureShuffle", () => {
  it("preserves all elements without mutating the input", () => {
    const input = [1, 2, 3, 4, 5];
    const shuffled = secureShuffle(input);
    expect(input).toEqual([1, 2, 3, 4, 5]);
    expect([...shuffled].sort()).toEqual(input);
  });
});

describe("generatePassword", () => {
  const baseOptions = {
    length: 16,
    useLowercase: true,
    useUppercase: true,
    useNumbers: true,
    useSymbols: true,
  };

  it("generates a password of the requested length", () => {
    const result = generatePassword(baseOptions);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toHaveLength(16);
  });

  it("only uses characters from the selected sets", () => {
    const result = generatePassword({
      length: 20,
      useLowercase: true,
      useUppercase: false,
      useNumbers: true,
      useSymbols: false,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toMatch(/^[a-z0-9]+$/);
  });

  it("guarantees at least one character from every selected set when length allows it", () => {
    for (let i = 0; i < 50; i++) {
      const result = generatePassword(baseOptions);
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      expect(result.value).toMatch(/[a-z]/);
      expect(result.value).toMatch(/[A-Z]/);
      expect(result.value).toMatch(/[0-9]/);
      expect(/[!@#$%^&*()\-_=+[\]{};:,.<>/?]/.test(result.value)).toBe(true);
    }
  });

  it("rejects a length outside the supported range", () => {
    expect(generatePassword({ ...baseOptions, length: 2 }).ok).toBe(false);
    expect(generatePassword({ ...baseOptions, length: 200 }).ok).toBe(false);
  });

  it("rejects when no character set is selected", () => {
    const result = generatePassword({
      length: 10,
      useLowercase: false,
      useUppercase: false,
      useNumbers: false,
      useSymbols: false,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects a length too short to fit every selected set", () => {
    const result = generatePassword({ ...baseOptions, length: 3 });
    expect(result.ok).toBe(false);
  });

  it("reports higher entropy for larger charsets at the same length", () => {
    const narrow = generatePassword({
      length: 16,
      useLowercase: true,
      useUppercase: false,
      useNumbers: false,
      useSymbols: false,
    });
    const wide = generatePassword(baseOptions);
    expect(narrow.ok && wide.ok).toBe(true);
    if (narrow.ok && wide.ok) {
      expect(wide.entropyBits).toBeGreaterThan(narrow.entropyBits);
    }
  });
});

describe("generatePassphrase", () => {
  it("joins the requested number of words with the separator", () => {
    const result = generatePassphrase({
      wordCount: 5,
      separator: "-",
      capitalize: false,
      includeNumber: false,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.split("-")).toHaveLength(5);
  });

  it("capitalizes each word when requested", () => {
    const result = generatePassphrase({
      wordCount: 4,
      separator: " ",
      capitalize: true,
      includeNumber: false,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      for (const word of result.value.split(" ")) {
        const letters = word.replace(/[0-9]/g, "");
        expect(letters[0]).toBe(letters[0]!.toUpperCase());
      }
    }
  });

  it("appends a number somewhere when requested", () => {
    const result = generatePassphrase({
      wordCount: 4,
      separator: "-",
      capitalize: false,
      includeNumber: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(/\d/.test(result.value)).toBe(true);
  });

  it("rejects a word count outside the supported range", () => {
    expect(
      generatePassphrase({
        wordCount: 1,
        separator: "-",
        capitalize: false,
        includeNumber: false,
      }).ok,
    ).toBe(false);
    expect(
      generatePassphrase({
        wordCount: 20,
        separator: "-",
        capitalize: false,
        includeNumber: false,
      }).ok,
    ).toBe(false);
  });
});

describe("strengthLabel", () => {
  it("labels low entropy as weak", () => {
    expect(strengthLabel(20)).toBe("Very weak");
  });

  it("labels high entropy as very strong", () => {
    expect(strengthLabel(100)).toBe("Very strong");
  });
});

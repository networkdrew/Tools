import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  evaluateContrast,
  parseColor,
  relativeLuminance,
  rgbToHex,
} from "./contrast";

describe("parseColor", () => {
  it("parses 6-digit hex", () => {
    const result = parseColor("#ff0000");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it("parses 3-digit hex by doubling each channel", () => {
    const result = parseColor("#f00");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it("parses 8-digit hex with alpha", () => {
    const result = parseColor("#ff000080");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.r).toBe(255);
    expect(result.value.a).toBeCloseTo(128 / 255, 5);
  });

  it("parses 4-digit hex with alpha", () => {
    const result = parseColor("#f008");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.a).toBeCloseTo(136 / 255, 2);
  });

  it("is case-insensitive for hex", () => {
    const result = parseColor("#FF0000");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it("parses rgb() with comma syntax", () => {
    const result = parseColor("rgb(0, 128, 255)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ r: 0, g: 128, b: 255, a: 1 });
  });

  it("parses rgba() with comma syntax and decimal alpha", () => {
    const result = parseColor("rgba(0, 128, 255, 0.5)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ r: 0, g: 128, b: 255, a: 0.5 });
  });

  it("parses modern space/slash rgb() syntax with percentage alpha", () => {
    const result = parseColor("rgb(0 128 255 / 50%)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.a).toBeCloseTo(0.5, 5);
  });

  it("parses percentage channel values", () => {
    const result = parseColor("rgb(100%, 0%, 0%)");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it("parses basic CSS color names", () => {
    const result = parseColor("white");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  it("is case-insensitive and trims whitespace for color names", () => {
    const result = parseColor("  Black  ");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });

  it("parses transparent as zero alpha", () => {
    const result = parseColor("transparent");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.a).toBe(0);
  });

  it("rejects empty input", () => {
    const result = parseColor("");
    expect(result.ok).toBe(false);
  });

  it("rejects whitespace-only input", () => {
    const result = parseColor("   ");
    expect(result.ok).toBe(false);
  });

  it("rejects an invalid hex length", () => {
    const result = parseColor("#ff0000f");
    expect(result.ok).toBe(false);
  });

  it("rejects non-hex characters in a hex string", () => {
    const result = parseColor("#gg0000");
    expect(result.ok).toBe(false);
  });

  it("rejects garbage input", () => {
    const result = parseColor("banana");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/couldn't understand/i);
  });

  it("rejects a malformed rgb() call", () => {
    const result = parseColor("rgb(1, 2)");
    expect(result.ok).toBe(false);
  });
});

describe("relativeLuminance", () => {
  it("is 0 for black", () => {
    expect(relativeLuminance({ r: 0, g: 0, b: 0 })).toBe(0);
  });

  it("is 1 for white", () => {
    expect(relativeLuminance({ r: 255, g: 255, b: 255 })).toBeCloseTo(1, 5);
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white", () => {
    const black = { r: 0, g: 0, b: 0, a: 1 };
    const white = { r: 255, g: 255, b: 255, a: 1 };
    expect(contrastRatio(black, white)).toBeCloseTo(21, 5);
  });

  it("is 1 for identical colors", () => {
    const gray = { r: 128, g: 128, b: 128, a: 1 };
    expect(contrastRatio(gray, gray)).toBeCloseTo(1, 5);
  });

  it("is order-independent (fg/bg swap gives the same ratio)", () => {
    const a = { r: 30, g: 60, b: 200, a: 1 };
    const b = { r: 240, g: 240, b: 210, a: 1 };
    expect(contrastRatio(a, b)).toBeCloseTo(contrastRatio(b, a), 10);
  });

  it("flattens a semi-transparent foreground against the background", () => {
    // 50% black text on a white background should land halfway in linear
    // terms, giving a real ratio well below the fully-opaque 21:1.
    const halfBlack = { r: 0, g: 0, b: 0, a: 0.5 };
    const white = { r: 255, g: 255, b: 255, a: 1 };
    const ratio = contrastRatio(halfBlack, white);
    expect(ratio).toBeGreaterThan(1);
    expect(ratio).toBeLessThan(21);
  });

  it("assumes a white page backdrop for a semi-transparent background", () => {
    const black = { r: 0, g: 0, b: 0, a: 1 };
    const halfWhiteBg = { r: 255, g: 255, b: 255, a: 0.5 };
    // Backdrop is white, so a 50% white background composited on white is
    // still white — same ratio as fully opaque white.
    expect(contrastRatio(black, halfWhiteBg)).toBeCloseTo(21, 5);
  });
});

describe("evaluateContrast", () => {
  it("passes every level for 21:1", () => {
    const evaluation = evaluateContrast(21);
    expect(evaluation.aaNormalText).toBe(true);
    expect(evaluation.aaLargeText).toBe(true);
    expect(evaluation.aaaNormalText).toBe(true);
    expect(evaluation.aaaLargeText).toBe(true);
    expect(evaluation.aaUiComponents).toBe(true);
  });

  it("passes only large-text and UI-component thresholds at 3:1", () => {
    const evaluation = evaluateContrast(3);
    expect(evaluation.aaLargeText).toBe(true);
    expect(evaluation.aaUiComponents).toBe(true);
    expect(evaluation.aaNormalText).toBe(false);
    expect(evaluation.aaaNormalText).toBe(false);
    expect(evaluation.aaaLargeText).toBe(false);
  });

  it("passes AA normal text but not AAA normal text at 4.5:1", () => {
    const evaluation = evaluateContrast(4.5);
    expect(evaluation.aaNormalText).toBe(true);
    expect(evaluation.aaaNormalText).toBe(false);
    expect(evaluation.aaaLargeText).toBe(true);
  });

  it("passes every text level at 7:1", () => {
    const evaluation = evaluateContrast(7);
    expect(evaluation.aaaNormalText).toBe(true);
  });

  it("fails everything below 3:1", () => {
    const evaluation = evaluateContrast(2.9);
    expect(evaluation.aaNormalText).toBe(false);
    expect(evaluation.aaLargeText).toBe(false);
    expect(evaluation.aaaNormalText).toBe(false);
    expect(evaluation.aaaLargeText).toBe(false);
    expect(evaluation.aaUiComponents).toBe(false);
  });
});

describe("rgbToHex", () => {
  it("formats each channel as 2-digit lowercase hex", () => {
    expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe("#ff0000");
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe("#000000");
    expect(rgbToHex({ r: 0, g: 128, b: 255 })).toBe("#0080ff");
  });

  it("rounds fractional channel values", () => {
    expect(rgbToHex({ r: 127.6, g: 0, b: 0 })).toBe("#800000");
  });
});

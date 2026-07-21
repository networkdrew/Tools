import { describe, expect, it } from "vitest";
import { computeCropWarnings } from "./warnings";

describe("computeCropWarnings", () => {
  it("returns no warnings for a plain non-animated, opaque source", () => {
    expect(
      computeCropWarnings({
        isAnimated: false,
        hasTransparency: false,
        sourceLabel: "PNG",
        outputFormat: "image/jpeg",
      }),
    ).toEqual([]);
  });

  it("warns about flattening when the source is animated, regardless of output format", () => {
    const warnings = computeCropWarnings({
      isAnimated: true,
      hasTransparency: false,
      sourceLabel: "GIF",
      outputFormat: "image/png",
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/animated/i);
    expect(warnings[0]).toMatch(/GIF/);
  });

  it("warns about transparency loss only when exporting to JPEG", () => {
    const toJpeg = computeCropWarnings({
      isAnimated: false,
      hasTransparency: true,
      sourceLabel: "PNG",
      outputFormat: "image/jpeg",
    });
    expect(toJpeg).toHaveLength(1);
    expect(toJpeg[0]).toMatch(/transparen/i);

    const toWebp = computeCropWarnings({
      isAnimated: false,
      hasTransparency: true,
      sourceLabel: "PNG",
      outputFormat: "image/webp",
    });
    expect(toWebp).toEqual([]);

    const toPng = computeCropWarnings({
      isAnimated: false,
      hasTransparency: true,
      sourceLabel: "PNG",
      outputFormat: "image/png",
    });
    expect(toPng).toEqual([]);
  });

  it("shows both warnings together when the source is animated and transparent and target is JPEG", () => {
    const warnings = computeCropWarnings({
      isAnimated: true,
      hasTransparency: true,
      sourceLabel: "WebP",
      outputFormat: "image/jpeg",
    });
    expect(warnings).toHaveLength(2);
  });
});

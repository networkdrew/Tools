import { describe, expect, it } from "vitest";
import { computeMetadataWarnings } from "./warnings";

describe("computeMetadataWarnings", () => {
  it("returns no warnings for a plain, non-animated, profile-free, non-converted source", () => {
    expect(
      computeMetadataWarnings({
        isAnimated: false,
        hasIccProfile: false,
        formatConverted: false,
        sourceLabel: "JPEG",
      }),
    ).toEqual([]);
  });

  it("warns about the PNG fallback when the format can't be re-encoded", () => {
    const warnings = computeMetadataWarnings({
      isAnimated: false,
      hasIccProfile: false,
      formatConverted: true,
      sourceLabel: "BMP",
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/PNG/);
    expect(warnings[0]).toMatch(/BMP/);
  });

  it("warns about flattening when the source is animated", () => {
    const warnings = computeMetadataWarnings({
      isAnimated: true,
      hasIccProfile: false,
      formatConverted: false,
      sourceLabel: "GIF",
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/animated/i);
    expect(warnings[0]).toMatch(/GIF/);
  });

  it("warns about the ICC color profile being removed", () => {
    const warnings = computeMetadataWarnings({
      isAnimated: false,
      hasIccProfile: true,
      formatConverted: false,
      sourceLabel: "JPEG",
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/color profile/i);
  });

  it("shows all three warnings together when applicable", () => {
    const warnings = computeMetadataWarnings({
      isAnimated: true,
      hasIccProfile: true,
      formatConverted: true,
      sourceLabel: "GIF",
    });
    expect(warnings).toHaveLength(3);
  });
});

import { describe, expect, it } from "vitest";
import { CROP_PRESETS, DEFAULT_CROP_PRESET_ID, getCropPreset } from "./presets";

describe("CROP_PRESETS", () => {
  it("has unique ids", () => {
    const ids = CROP_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("includes every required preset", () => {
    const ids = CROP_PRESETS.map((p) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining([
        "square",
        "4-3",
        "3-2",
        "16-9",
        "profile-photo",
        "instagram-post",
        "instagram-story",
        "facebook-cover",
        "youtube-thumbnail",
        "custom",
      ]),
    );
  });

  it("gives every non-freeform preset a positive aspect ratio", () => {
    for (const preset of CROP_PRESETS) {
      if (preset.aspect !== null) {
        expect(preset.aspect).toBeGreaterThan(0);
      }
    }
  });

  it("gives every preset with a suggested output positive dimensions matching its aspect ratio", () => {
    for (const preset of CROP_PRESETS) {
      if (!preset.output) continue;
      expect(preset.output.width).toBeGreaterThan(0);
      expect(preset.output.height).toBeGreaterThan(0);
      if (preset.aspect) {
        expect(preset.output.width / preset.output.height).toBeCloseTo(
          preset.aspect,
          5,
        );
      }
    }
  });
});

describe("getCropPreset", () => {
  it("finds a preset by id", () => {
    expect(getCropPreset("square")?.aspect).toBe(1);
  });

  it("returns undefined for an unknown id", () => {
    expect(getCropPreset("nonexistent")).toBeUndefined();
  });
});

describe("DEFAULT_CROP_PRESET_ID", () => {
  it("refers to a real preset", () => {
    expect(getCropPreset(DEFAULT_CROP_PRESET_ID)).toBeDefined();
  });
});

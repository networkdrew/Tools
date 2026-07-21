import { describe, expect, it } from "vitest";
import {
  computeCompositePlan,
  dimensionsFromPercent,
  linkedDimension,
} from "./resize";

describe("computeCompositePlan", () => {
  const cropSize = { width: 400, height: 200 };

  describe("mode 'fit'", () => {
    it("scales down to fit within target, preserving aspect ratio", () => {
      const result = computeCompositePlan(
        cropSize,
        { width: 100, height: 100 },
        "fit",
        false,
      );
      expect(result).toEqual({
        ok: true,
        value: {
          canvasWidth: 100,
          canvasHeight: 50,
          sourceRect: { x: 0, y: 0, width: 400, height: 200 },
          upscaled: false,
        },
      });
    });

    it("never upscales beyond the crop's own size when allowUpscale is false", () => {
      const result = computeCompositePlan(
        cropSize,
        { width: 4000, height: 4000 },
        "fit",
        false,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.canvasWidth).toBe(400);
      expect(result.value.canvasHeight).toBe(200);
      expect(result.value.upscaled).toBe(false);
    });

    it("upscales when explicitly allowed", () => {
      const result = computeCompositePlan(
        cropSize,
        { width: 800, height: 800 },
        "fit",
        true,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.canvasWidth).toBe(800);
      expect(result.value.canvasHeight).toBe(400);
      expect(result.value.upscaled).toBe(true);
    });
  });

  describe("mode 'exact'", () => {
    it("stretches independently on each axis, ignoring aspect ratio", () => {
      const result = computeCompositePlan(
        cropSize,
        { width: 800, height: 300 },
        "exact",
        true,
      );
      expect(result).toEqual({
        ok: true,
        value: {
          canvasWidth: 800,
          canvasHeight: 300,
          sourceRect: { x: 0, y: 0, width: 400, height: 200 },
          upscaled: true,
        },
      });
    });

    it("caps each axis at 1x when upscaling isn't allowed", () => {
      const result = computeCompositePlan(
        cropSize,
        { width: 100, height: 1000 },
        "exact",
        false,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      // width axis (100 < 400) shrinks normally; height axis (1000 > 200) is capped at the original 200.
      expect(result.value.canvasWidth).toBe(100);
      expect(result.value.canvasHeight).toBe(200);
    });
  });

  describe("mode 'fill'", () => {
    it("produces exactly the target size, center-cropping the source", () => {
      const result = computeCompositePlan(
        cropSize,
        { width: 100, height: 100 },
        "fill",
        true,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.canvasWidth).toBe(100);
      expect(result.value.canvasHeight).toBe(100);
      // Covering a 400x200 crop into a 1:1 box needs a 200x200 centered source slice.
      expect(result.value.sourceRect).toEqual({
        x: 100,
        y: 0,
        width: 200,
        height: 200,
      });
    });

    it("degrades to fit-like behavior (no upscale) when covering the target would require enlarging pixels", () => {
      const result = computeCompositePlan(
        cropSize,
        { width: 4000, height: 4000 },
        "fill",
        false,
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.canvasWidth).toBe(400);
      expect(result.value.canvasHeight).toBe(200);
      expect(result.value.sourceRect).toEqual({
        x: 0,
        y: 0,
        width: 400,
        height: 200,
      });
      expect(result.value.upscaled).toBe(false);
    });
  });

  it("rejects a zero-size crop", () => {
    const result = computeCompositePlan(
      { width: 0, height: 0 },
      { width: 100, height: 100 },
      "fit",
      false,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects non-positive target dimensions", () => {
    const result = computeCompositePlan(
      cropSize,
      { width: 0, height: 100 },
      "fit",
      false,
    );
    expect(result.ok).toBe(false);
  });
});

describe("dimensionsFromPercent", () => {
  it("scales the crop size by the given percentage", () => {
    expect(dimensionsFromPercent({ width: 200, height: 100 }, 50)).toEqual({
      ok: true,
      value: { width: 100, height: 50 },
    });
  });

  it("rejects a zero or negative percentage", () => {
    expect(dimensionsFromPercent({ width: 200, height: 100 }, 0).ok).toBe(
      false,
    );
    expect(dimensionsFromPercent({ width: 200, height: 100 }, -10).ok).toBe(
      false,
    );
  });
});

describe("linkedDimension", () => {
  it("derives height from width using the given ratio", () => {
    expect(linkedDimension("width", 400, 999, 2)).toEqual({
      width: 400,
      height: 200,
    });
  });

  it("derives width from height using the given ratio", () => {
    expect(linkedDimension("height", 999, 200, 2)).toEqual({
      width: 400,
      height: 200,
    });
  });

  it("leaves both values unchanged for an invalid ratio", () => {
    expect(linkedDimension("width", 400, 300, 0)).toEqual({
      width: 400,
      height: 300,
    });
  });
});

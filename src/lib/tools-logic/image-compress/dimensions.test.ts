import { describe, expect, it } from "vitest";
import { computeTargetDimensions } from "./dimensions";

describe("computeTargetDimensions", () => {
  it("returns the original size unchanged for mode 'none'", () => {
    const result = computeTargetDimensions(
      { width: 1200, height: 800 },
      { mode: "none" },
    );
    expect(result).toEqual({ ok: true, value: { width: 1200, height: 800 } });
  });

  it("scales down proportionally for mode 'scale'", () => {
    const result = computeTargetDimensions(
      { width: 1200, height: 800 },
      { mode: "scale", scalePercent: 50 },
    );
    expect(result).toEqual({ ok: true, value: { width: 600, height: 400 } });
  });

  it("scales up proportionally for mode 'scale' above 100%", () => {
    const result = computeTargetDimensions(
      { width: 400, height: 200 },
      { mode: "scale", scalePercent: 150 },
    );
    expect(result).toEqual({ ok: true, value: { width: 600, height: 300 } });
  });

  it("rejects a zero or negative scale percentage", () => {
    const result = computeTargetDimensions(
      { width: 1200, height: 800 },
      { mode: "scale", scalePercent: 0 },
    );
    expect(result.ok).toBe(false);
  });

  it("fits within bounds while preserving aspect ratio (width-constrained)", () => {
    const result = computeTargetDimensions(
      { width: 2000, height: 1000 },
      { mode: "fit", maxWidth: 800, maxHeight: 800 },
    );
    expect(result).toEqual({ ok: true, value: { width: 800, height: 400 } });
  });

  it("fits within bounds while preserving aspect ratio (height-constrained)", () => {
    const result = computeTargetDimensions(
      { width: 1000, height: 2000 },
      { mode: "fit", maxWidth: 800, maxHeight: 800 },
    );
    expect(result).toEqual({ ok: true, value: { width: 400, height: 800 } });
  });

  it("never upscales for mode 'fit' when the image is already smaller than the bounds", () => {
    const result = computeTargetDimensions(
      { width: 300, height: 200 },
      { mode: "fit", maxWidth: 800, maxHeight: 800 },
    );
    expect(result).toEqual({ ok: true, value: { width: 300, height: 200 } });
  });

  it("rejects non-positive bounds for mode 'fit'", () => {
    const result = computeTargetDimensions(
      { width: 1200, height: 800 },
      { mode: "fit", maxWidth: 0, maxHeight: 800 },
    );
    expect(result.ok).toBe(false);
  });

  it("rejects an original image with zero dimensions", () => {
    const result = computeTargetDimensions(
      { width: 0, height: 0 },
      { mode: "none" },
    );
    expect(result.ok).toBe(false);
  });
});

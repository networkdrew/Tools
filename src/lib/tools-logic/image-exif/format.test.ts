import { describe, expect, it } from "vitest";
import { formatExifAsText } from "./format";
import type { ExifData } from "./exif";

function baseData(overrides: Partial<ExifData> = {}): ExifData {
  return {
    camera: [],
    capture: [],
    image: [{ label: "Dimensions", value: "800 × 600 px" }],
    gps: [],
    gpsCoordinates: null,
    hasMetadata: false,
    ...overrides,
  };
}

describe("formatExifAsText", () => {
  it("formats a section with an indented label: value line per field", () => {
    const text = formatExifAsText(
      baseData({ camera: [{ label: "Make", value: "Canon" }] }),
    );
    expect(text).toContain("Camera");
    expect(text).toContain("  Make: Canon");
  });

  it("omits empty sections entirely", () => {
    const text = formatExifAsText(baseData());
    expect(text).not.toContain("Camera");
    expect(text).not.toContain("Capture");
    expect(text).not.toContain("GPS");
    expect(text).toContain("Image");
  });

  it("includes every non-empty section in a fixed order", () => {
    const text = formatExifAsText(
      baseData({
        camera: [{ label: "Make", value: "Canon" }],
        capture: [{ label: "ISO", value: "ISO 400" }],
        gps: [{ label: "Latitude", value: "37.774900° N" }],
      }),
    );
    const cameraIndex = text.indexOf("Camera");
    const captureIndex = text.indexOf("Capture");
    const imageIndex = text.indexOf("Image");
    const gpsIndex = text.indexOf("GPS");
    expect(cameraIndex).toBeLessThan(captureIndex);
    expect(captureIndex).toBeLessThan(imageIndex);
    expect(imageIndex).toBeLessThan(gpsIndex);
  });

  it("has no leading or trailing blank lines", () => {
    const text = formatExifAsText(baseData());
    expect(text).toBe(text.trim());
  });
});

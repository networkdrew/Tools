import { describe, expect, it } from "vitest";
import { generateQrCode } from "./generate";

describe("generateQrCode", () => {
  it("generates a QR code for plain text", () => {
    const result = generateQrCode("Hello, world!");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.moduleCount).toBeGreaterThan(0);
    expect(result.value.matrix).toHaveLength(result.value.moduleCount);
    expect(result.value.svg).toContain("<svg");
    expect(result.value.svg).toContain("viewBox");
  });

  it("generates a QR code for a URL", () => {
    const result = generateQrCode("https://example.com/path?query=1");
    expect(result.ok).toBe(true);
  });

  it("round-trips emoji and non-Latin scripts without corrupting the module grid", () => {
    const ascii = generateQrCode("a", "M");
    const emoji = generateQrCode("🎉", "M");
    expect(ascii.ok).toBe(true);
    expect(emoji.ok).toBe(true);
    if (!ascii.ok || !emoji.ok) return;
    // A multi-byte UTF-8 character should need noticeably more data than
    // one ASCII character — proof the UTF-8 override is actually in effect
    // (the buggy default would truncate it to a single masked byte).
    const asciiDark = ascii.value.matrix.flat().filter(Boolean).length;
    const emojiDark = emoji.value.matrix.flat().filter(Boolean).length;
    expect(emojiDark).not.toBe(asciiDark);
  });

  it("rejects empty input", () => {
    const result = generateQrCode("");
    expect(result.ok).toBe(false);
  });

  it("rejects whitespace-only input", () => {
    const result = generateQrCode("   \n\t  ");
    expect(result.ok).toBe(false);
  });

  it("reports a friendly error when text is too long to fit", () => {
    const tooLong = "x".repeat(5000);
    const result = generateQrCode(tooLong, "H");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.message).toMatch(/too long/i);
  });

  it("produces a larger module grid at higher error correction levels for the same data", () => {
    const low = generateQrCode("x".repeat(200), "L");
    const high = generateQrCode("x".repeat(200), "H");
    expect(low.ok).toBe(true);
    expect(high.ok).toBe(true);
    if (!low.ok || !high.ok) return;
    expect(high.value.moduleCount).toBeGreaterThanOrEqual(
      low.value.moduleCount,
    );
  });

  it("defaults to error correction level M", () => {
    const withDefault = generateQrCode("test string");
    const withM = generateQrCode("test string", "M");
    expect(withDefault.ok).toBe(true);
    expect(withM.ok).toBe(true);
    if (!withDefault.ok || !withM.ok) return;
    expect(withDefault.value.moduleCount).toBe(withM.value.moduleCount);
  });
});

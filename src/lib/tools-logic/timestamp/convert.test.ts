import { describe, expect, it } from "vitest";
import { parseTimestampInput } from "./convert";

describe("parseTimestampInput", () => {
  it("rejects empty input", () => {
    expect(parseTimestampInput("   ").ok).toBe(false);
  });

  it("detects a 10-digit number as seconds", () => {
    const result = parseTimestampInput("1737331200");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.detectedFormat).toBe("unix-seconds");
      expect(result.unixSeconds).toBe(1737331200);
      expect(result.iso).toBe("2025-01-20T00:00:00.000Z");
    }
  });

  it("detects a 13-digit number as milliseconds", () => {
    const result = parseTimestampInput("1737331200000");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.detectedFormat).toBe("unix-milliseconds");
      expect(result.unixMillis).toBe(1737331200000);
      expect(result.iso).toBe("2025-01-20T00:00:00.000Z");
    }
  });

  it("parses an ISO 8601 date string", () => {
    const result = parseTimestampInput("2025-01-20T00:00:00.000Z");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.detectedFormat).toBe("date-string");
      expect(result.unixSeconds).toBe(1737331200);
    }
  });

  it("rejects a number with too many digits", () => {
    const result = parseTimestampInput("12345678901234567890");
    expect(result.ok).toBe(false);
  });

  it("rejects a nonsense string", () => {
    const result = parseTimestampInput("not a date");
    expect(result.ok).toBe(false);
  });

  it("supports negative timestamps (before the epoch)", () => {
    const result = parseTimestampInput("-3600");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.iso).toBe("1969-12-31T23:00:00.000Z");
  });

  it("round-trips the current time in seconds", () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const result = parseTimestampInput(String(nowSeconds));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.unixSeconds).toBe(nowSeconds);
  });
});

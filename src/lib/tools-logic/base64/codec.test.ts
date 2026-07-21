import { describe, expect, it } from "vitest";
import { decodeBase64, encodeBase64 } from "./codec";

describe("encodeBase64", () => {
  it("encodes plain ASCII text", () => {
    const result = encodeBase64("Hello, world!");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("SGVsbG8sIHdvcmxkIQ==");
  });

  it("round-trips emoji and accented characters", () => {
    const original = "Café 🎉 résumé";
    const encoded = encodeBase64(original);
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;
    const decoded = decodeBase64(encoded.value);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.value).toBe(original);
  });

  it("produces URL-safe output without +, /, or padding", () => {
    const result = encodeBase64("???>>>", true);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).not.toMatch(/[+/=]/);
    }
  });
});

describe("decodeBase64", () => {
  it("decodes standard Base64", () => {
    const result = decodeBase64("SGVsbG8sIHdvcmxkIQ==");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value).toBe("Hello, world!");
  });

  it("decodes URL-safe Base64", () => {
    const encoded = encodeBase64("a?b/c+d", true);
    expect(encoded.ok).toBe(true);
    if (!encoded.ok) return;
    const decoded = decodeBase64(encoded.value, true);
    expect(decoded.ok).toBe(true);
    if (decoded.ok) expect(decoded.value).toBe("a?b/c+d");
  });

  it("rejects empty input", () => {
    expect(decodeBase64("").ok).toBe(false);
  });

  it("rejects strings with invalid Base64 characters", () => {
    expect(decodeBase64("not valid base64!!").ok).toBe(false);
  });

  it("rejects strings with incorrect padding length", () => {
    expect(decodeBase64("abcde").ok).toBe(false);
  });
});

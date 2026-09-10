import { describe, expect, it } from "vitest";
import {
  convertCurrency,
  effectiveAnnualRate,
  weightedAverageCostOfCapital,
} from "./misc";

describe("convertCurrency", () => {
  it("converts via USD as the common base", () => {
    const result = convertCurrency(100, "USD", "EUR");
    expect(result).toEqual({ ok: true, value: { converted: 94 } });
  });

  it("round-trips through a third currency", () => {
    const result = convertCurrency(100, "EUR", "GBP");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.converted).toBeCloseTo(88.2979, 3);
  });

  it("rejects a non-finite amount", () => {
    expect(convertCurrency(NaN, "USD", "EUR").ok).toBe(false);
  });
});

describe("effectiveAnnualRate", () => {
  it("converts nominal rate and compounding frequency to EAR", () => {
    const result = effectiveAnnualRate(10, 12);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.earPercent).toBeCloseTo(10.4713, 3);
  });

  it("rejects zero compounding periods", () => {
    expect(effectiveAnnualRate(10, 0).ok).toBe(false);
  });
});

describe("weightedAverageCostOfCapital", () => {
  it("blends cost of equity and after-tax cost of debt by weight", () => {
    const result = weightedAverageCostOfCapital(500000, 500000, 12, 6, 25);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.waccPercent).toBeCloseTo(8.25, 2);
  });

  it("rejects zero equity plus debt", () => {
    expect(weightedAverageCostOfCapital(0, 0, 12, 6, 25).ok).toBe(false);
  });
});

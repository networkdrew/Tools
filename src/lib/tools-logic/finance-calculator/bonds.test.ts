import { describe, expect, it } from "vitest";
import { bondPrice, bondYieldToMaturity, treasuryBillYield } from "./bonds";

describe("bondPrice", () => {
  it("prices a bond below par when the market yield exceeds the coupon", () => {
    const result = bondPrice(1000, 5, 6, 10);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.price).toBeCloseTo(926.4, 1);
  });

  it("rejects a fractional number of years", () => {
    expect(bondPrice(1000, 5, 6, 10.5).ok).toBe(false);
  });

  it("rejects a non-positive face value", () => {
    expect(bondPrice(0, 5, 6, 10).ok).toBe(false);
  });
});

describe("bondYieldToMaturity", () => {
  it("approximates YTM for a bond trading below face value", () => {
    const result = bondYieldToMaturity(950, 1000, 5, 10);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.ytmPercent).toBeCloseTo(5.67, 1);
  });

  it("rejects a non-positive current price", () => {
    expect(bondYieldToMaturity(0, 1000, 5, 10).ok).toBe(false);
  });
});

describe("treasuryBillYield", () => {
  it("computes the annualized discount yield", () => {
    const result = treasuryBillYield(100000, 98000, 90);
    expect(result).toEqual({ ok: true, value: { discountYieldPercent: 8 } });
  });

  it("rejects a zero purchase price", () => {
    expect(treasuryBillYield(100000, 0, 90).ok).toBe(false);
  });
});

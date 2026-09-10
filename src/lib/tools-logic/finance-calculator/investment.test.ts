import { describe, expect, it } from "vitest";
import {
  compoundInterest,
  inflationFutureValue,
  internalRateOfReturn,
  netPresentValue,
  paybackPeriod,
  retirementFutureValue,
  simpleInterest,
} from "./investment";

describe("compoundInterest", () => {
  it("compounds a principal at a fixed rate and frequency", () => {
    const result = compoundInterest(5000, 5, 12, 10);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.finalAmount).toBeCloseTo(8235.05, 2);
  });

  it("rejects a non-positive principal", () => {
    expect(compoundInterest(0, 5, 12, 10).ok).toBe(false);
  });

  it("rejects zero compounding periods", () => {
    expect(compoundInterest(1000, 5, 0, 10).ok).toBe(false);
  });
});

describe("simpleInterest", () => {
  it("computes interest = principal * rate * time", () => {
    const result = simpleInterest(1000, 5, 2);
    expect(result).toEqual({ ok: true, value: { interest: 100, total: 1100 } });
  });

  it("rejects a negative principal", () => {
    expect(simpleInterest(-1, 5, 2).ok).toBe(false);
  });
});

describe("inflationFutureValue", () => {
  it("projects a present amount forward at a constant inflation rate", () => {
    const result = inflationFutureValue(1000, 3, 10);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.futureValue).toBeCloseTo(1343.92, 2);
  });

  it("rejects a negative number of years", () => {
    expect(inflationFutureValue(1000, 3, -1).ok).toBe(false);
  });
});

describe("retirementFutureValue", () => {
  it("computes future value of equal monthly contributions", () => {
    const result = retirementFutureValue(500, 6, 20);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.futureValue).toBeCloseTo(231020.45, 2);
  });

  it("rejects a non-positive monthly contribution", () => {
    expect(retirementFutureValue(0, 6, 20).ok).toBe(false);
  });
});

describe("paybackPeriod", () => {
  it("finds the fractional period cash flows turn non-negative", () => {
    const result = paybackPeriod([-1000, 300, 300, 300, 300]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.recovered).toBe(true);
    expect(result.value.years).toBeCloseTo(4.3333, 3);
  });

  it("reports when the investment is never recovered", () => {
    const result = paybackPeriod([-1000, 100, 100]);
    expect(result).toEqual({
      ok: true,
      value: { recovered: false, years: null },
    });
  });

  it("rejects an empty cash flow list", () => {
    expect(paybackPeriod([]).ok).toBe(false);
  });
});

describe("netPresentValue", () => {
  it("discounts a series of cash flows at a fixed rate", () => {
    const result = netPresentValue([-1000, 200, 300, 500], 10);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.npv).toBeCloseTo(-194.59, 2);
  });

  it("rejects a discount rate at or below -100%", () => {
    expect(netPresentValue([-1000, 500], -100).ok).toBe(false);
  });
});

describe("internalRateOfReturn", () => {
  it("finds the rate that makes NPV zero", () => {
    const result = internalRateOfReturn([-1000, 500, 500, 500]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.irrPercent).toBeCloseTo(23.375, 2);
  });

  it("rejects all-non-negative cash flows as undefined", () => {
    const result = internalRateOfReturn([100, 200, 300]);
    expect(result.ok).toBe(false);
  });
});

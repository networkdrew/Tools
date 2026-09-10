import { describe, expect, it } from "vitest";
import {
  amortizationSchedule,
  loanToValue,
  mortgagePayment,
  weightedAverageMaturity,
  weightedAverageRate,
} from "./loans";

describe("mortgagePayment", () => {
  it("computes monthly payment, total payment, and total interest", () => {
    const result = mortgagePayment(300000, 4, 30);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.monthlyPayment).toBeCloseTo(1432.25, 2);
    expect(result.value.totalPayment).toBeCloseTo(515608.52, 2);
    expect(result.value.totalInterest).toBeCloseTo(215608.52, 2);
  });

  it("handles a 0% interest rate as a straight division", () => {
    const result = mortgagePayment(12000, 0, 2);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.monthlyPayment).toBe(500);
    expect(result.value.totalInterest).toBe(0);
  });

  it("rejects a non-positive principal", () => {
    const result = mortgagePayment(0, 4, 30);
    expect(result).toEqual({
      ok: false,
      message: "Loan amount must be greater than 0.",
    });
  });

  it("rejects NaN input", () => {
    const result = mortgagePayment(NaN, 4, 30);
    expect(result.ok).toBe(false);
  });
});

describe("amortizationSchedule", () => {
  it("generates one row per month, ending near a zero balance", () => {
    const result = amortizationSchedule(1200, 12, 1);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.schedule).toHaveLength(12);
    expect(result.value.schedule[0]?.interest).toBeCloseTo(12, 2);
    expect(result.value.schedule[0]?.principal).toBeCloseTo(94.62, 2);
    expect(result.value.schedule.at(-1)?.remaining).toBeCloseTo(0, 6);
  });

  it("propagates the same validation as mortgagePayment", () => {
    const result = amortizationSchedule(-100, 5, 10);
    expect(result.ok).toBe(false);
  });
});

describe("loanToValue", () => {
  it("computes LTV as a percentage", () => {
    const result = loanToValue(200000, 250000);
    expect(result).toEqual({ ok: true, value: { ltvPercent: 80 } });
  });

  it("rejects a zero asset value", () => {
    const result = loanToValue(200000, 0);
    expect(result.ok).toBe(false);
  });
});

describe("weightedAverageRate", () => {
  it("weights each loan's rate by its principal", () => {
    const result = weightedAverageRate([
      { principal: 10000, ratePercent: 5 },
      { principal: 20000, ratePercent: 7 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.weightedRatePercent).toBeCloseTo(6.3333, 3);
  });

  it("rejects an empty loan list", () => {
    const result = weightedAverageRate([]);
    expect(result.ok).toBe(false);
  });

  it("ignores rows with a non-positive principal", () => {
    const result = weightedAverageRate([
      { principal: 0, ratePercent: 99 },
      { principal: 10000, ratePercent: 5 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.weightedRatePercent).toBe(5);
  });
});

describe("weightedAverageMaturity", () => {
  it("weights each loan's maturity by its principal", () => {
    const result = weightedAverageMaturity([
      { principal: 10000, years: 5 },
      { principal: 30000, years: 10 },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.weightedYears).toBeCloseTo(8.75, 3);
  });

  it("rejects an empty loan list", () => {
    const result = weightedAverageMaturity([]);
    expect(result.ok).toBe(false);
  });
});

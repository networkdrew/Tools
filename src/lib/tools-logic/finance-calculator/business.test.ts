import { describe, expect, it } from "vitest";
import {
  breakEvenUnits,
  currentAndQuickRatio,
  daysPayableOutstanding,
  daysSalesOutstanding,
  debtServiceCoverageRatio,
  debtToIncome,
  ebitdaAndDebtRatio,
  markupAndMargin,
  returnOnInvestment,
} from "./business";

describe("returnOnInvestment", () => {
  it("computes percentage gain and raw gain", () => {
    const result = returnOnInvestment(1000, 1500);
    expect(result).toEqual({ ok: true, value: { roiPercent: 50, gain: 500 } });
  });

  it("rejects a zero initial investment", () => {
    expect(returnOnInvestment(0, 1500).ok).toBe(false);
  });
});

describe("breakEvenUnits", () => {
  it("computes units needed for revenue to equal cost", () => {
    const result = breakEvenUnits(5000, 100, 60);
    expect(result).toEqual({ ok: true, value: { units: 125 } });
  });

  it("rejects a price that doesn't exceed variable cost", () => {
    expect(breakEvenUnits(5000, 50, 60).ok).toBe(false);
  });
});

describe("debtToIncome", () => {
  it("computes DTI as a percentage", () => {
    const result = debtToIncome(1500, 5000);
    expect(result).toEqual({ ok: true, value: { dtiPercent: 30 } });
  });

  it("rejects a zero income", () => {
    expect(debtToIncome(1500, 0).ok).toBe(false);
  });
});

describe("debtServiceCoverageRatio", () => {
  it("divides net operating income by debt service", () => {
    const result = debtServiceCoverageRatio(60000, 40000);
    expect(result).toEqual({ ok: true, value: { dscr: 1.5 } });
  });

  it("rejects a zero debt service", () => {
    expect(debtServiceCoverageRatio(60000, 0).ok).toBe(false);
  });
});

describe("markupAndMargin", () => {
  it("computes mark-up over cost and margin of price", () => {
    const result = markupAndMargin(60, 100);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.markupPercent).toBeCloseTo(66.6667, 3);
    expect(result.value.marginPercent).toBe(40);
  });

  it("rejects a zero cost", () => {
    expect(markupAndMargin(0, 100).ok).toBe(false);
  });
});

describe("currentAndQuickRatio", () => {
  it("computes both liquidity ratios", () => {
    const result = currentAndQuickRatio(50000, 20000, 30000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.currentRatio).toBeCloseTo(1.6667, 3);
    expect(result.value.quickRatio).toBe(1);
  });

  it("rejects a zero current liabilities", () => {
    expect(currentAndQuickRatio(50000, 20000, 0).ok).toBe(false);
  });
});

describe("ebitdaAndDebtRatio", () => {
  it("computes EBITDA and the resulting Debt/EBITDA ratio", () => {
    const result = ebitdaAndDebtRatio(
      200000,
      120000,
      10000,
      5000,
      10000,
      200000,
    );
    expect(result).toEqual({
      ok: true,
      value: { ebitda: 80000, debtToEbitda: 2.5 },
    });
  });

  it("reports a null Debt/EBITDA ratio when EBITDA is exactly zero", () => {
    const result = ebitdaAndDebtRatio(0, 0, 0, 0, 0, 100000);
    expect(result).toEqual({
      ok: true,
      value: { ebitda: 0, debtToEbitda: null },
    });
  });
});

describe("daysSalesOutstanding", () => {
  it("computes average collection days", () => {
    const result = daysSalesOutstanding(50000, 600000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.days).toBeCloseTo(30.4167, 3);
  });

  it("rejects zero credit sales", () => {
    expect(daysSalesOutstanding(50000, 0).ok).toBe(false);
  });
});

describe("daysPayableOutstanding", () => {
  it("computes average payment days", () => {
    const result = daysPayableOutstanding(40000, 300000);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.days).toBeCloseTo(48.6667, 3);
  });

  it("rejects zero cost of goods sold", () => {
    expect(daysPayableOutstanding(40000, 0).ok).toBe(false);
  });
});

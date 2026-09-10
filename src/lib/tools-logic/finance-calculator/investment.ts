import { requireFinite, type FinanceResult } from "./types";

/** Final value of a principal compounded at a fixed rate. */
export function compoundInterest(
  principal: number,
  annualRatePercent: number,
  timesPerYear: number,
  years: number,
): FinanceResult<{ finalAmount: number }> {
  const invalid = requireFinite({
    principal,
    "interest rate": annualRatePercent,
    "times compounded per year": timesPerYear,
    years,
  });
  if (invalid) return invalid;
  if (principal <= 0) {
    return { ok: false, message: "Principal must be greater than 0." };
  }
  if (timesPerYear <= 0) {
    return {
      ok: false,
      message: "Times compounded per year must be greater than 0.",
    };
  }
  if (years < 0) {
    return { ok: false, message: "Number of years can't be negative." };
  }
  const finalAmount =
    principal *
    Math.pow(1 + annualRatePercent / 100 / timesPerYear, timesPerYear * years);
  return { ok: true, value: { finalAmount } };
}

/** Simple (non-compounding) interest: Interest = P * r * t. */
export function simpleInterest(
  principal: number,
  annualRatePercent: number,
  years: number,
): FinanceResult<{ interest: number; total: number }> {
  const invalid = requireFinite({
    principal,
    "interest rate": annualRatePercent,
    years,
  });
  if (invalid) return invalid;
  if (principal <= 0) {
    return { ok: false, message: "Principal must be greater than 0." };
  }
  if (years < 0) {
    return { ok: false, message: "Time can't be negative." };
  }
  const interest = principal * (annualRatePercent / 100) * years;
  return { ok: true, value: { interest, total: principal + interest } };
}

/** Future value of a present amount under a constant annual inflation rate. */
export function inflationFutureValue(
  amount: number,
  annualRatePercent: number,
  years: number,
): FinanceResult<{ futureValue: number }> {
  const invalid = requireFinite({
    amount,
    "inflation rate": annualRatePercent,
    years,
  });
  if (invalid) return invalid;
  if (amount <= 0) {
    return { ok: false, message: "Amount must be greater than 0." };
  }
  if (years < 0) {
    return { ok: false, message: "Number of years can't be negative." };
  }
  const futureValue = amount * Math.pow(1 + annualRatePercent / 100, years);
  return { ok: true, value: { futureValue } };
}

/** Future value of equal monthly contributions compounding monthly. */
export function retirementFutureValue(
  monthlyContribution: number,
  annualRatePercent: number,
  years: number,
): FinanceResult<{ futureValue: number }> {
  const invalid = requireFinite({
    "monthly contribution": monthlyContribution,
    "interest rate": annualRatePercent,
    years,
  });
  if (invalid) return invalid;
  if (monthlyContribution <= 0) {
    return {
      ok: false,
      message: "Monthly contribution must be greater than 0.",
    };
  }
  if (years <= 0) {
    return { ok: false, message: "Number of years must be greater than 0." };
  }
  const monthlyRate = annualRatePercent / 100 / 12;
  const totalMonths = years * 12;
  const futureValue =
    monthlyRate === 0
      ? monthlyContribution * totalMonths
      : monthlyContribution *
        ((Math.pow(1 + monthlyRate, totalMonths) - 1) / monthlyRate);
  return { ok: true, value: { futureValue } };
}

export interface PaybackResult {
  recovered: boolean;
  years: number | null;
}

/** How many periods it takes cumulative cash flows to recoup the initial outlay. */
export function paybackPeriod(
  cashFlows: number[],
): FinanceResult<PaybackResult> {
  if (cashFlows.length === 0) {
    return { ok: false, message: "Enter at least one cash flow." };
  }
  if (cashFlows.some((cf) => !Number.isFinite(cf))) {
    return { ok: false, message: "Every cash flow must be a valid number." };
  }

  let cumulative = 0;
  for (let i = 0; i < cashFlows.length; i++) {
    const cf = cashFlows[i] ?? 0;
    const previous = cumulative;
    cumulative += cf;
    if (cumulative >= 0) {
      const remainder = 0 - previous;
      const fraction = cf === 0 ? 0 : remainder / cf;
      return { ok: true, value: { recovered: true, years: i + fraction } };
    }
  }
  return { ok: true, value: { recovered: false, years: null } };
}

/** Net present value of a series of cash flows at a fixed discount rate. */
export function netPresentValue(
  cashFlows: number[],
  discountRatePercent: number,
): FinanceResult<{ npv: number }> {
  if (cashFlows.length === 0) {
    return { ok: false, message: "Enter at least one cash flow." };
  }
  if (cashFlows.some((cf) => !Number.isFinite(cf))) {
    return { ok: false, message: "Every cash flow must be a valid number." };
  }
  if (!Number.isFinite(discountRatePercent) || discountRatePercent <= -100) {
    return { ok: false, message: "Discount rate must be greater than -100%." };
  }
  const rate = discountRatePercent / 100;
  const npv = cashFlows.reduce(
    (sum, cf, t) => sum + cf / Math.pow(1 + rate, t),
    0,
  );
  return { ok: true, value: { npv } };
}

/** Approximate internal rate of return via bisection on the NPV curve. */
export function internalRateOfReturn(
  cashFlows: number[],
): FinanceResult<{ irrPercent: number }> {
  if (cashFlows.length === 0) {
    return { ok: false, message: "Enter at least one cash flow." };
  }
  if (cashFlows.some((cf) => !Number.isFinite(cf))) {
    return { ok: false, message: "Every cash flow must be a valid number." };
  }
  if (cashFlows.every((cf) => cf >= 0)) {
    return {
      ok: false,
      message:
        "All cash flows are non-negative, so IRR is undefined — include at least one negative (outgoing) cash flow.",
    };
  }

  const npvAt = (rate: number) =>
    cashFlows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + rate, t), 0);

  let lower = -0.9999;
  let upper = 1.0;
  let guess = 0;
  const tolerance = 1e-7;
  for (let i = 0; i < 100; i++) {
    guess = (lower + upper) / 2;
    const value = npvAt(guess);
    if (Math.abs(value) < tolerance) break;
    if (value > 0) {
      lower = guess;
    } else {
      upper = guess;
    }
  }
  return { ok: true, value: { irrPercent: guess * 100 } };
}

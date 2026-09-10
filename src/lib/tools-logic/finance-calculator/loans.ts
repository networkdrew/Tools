import { requireFinite, type FinanceResult } from "./types";

export interface MortgagePaymentResult {
  monthlyPayment: number;
  totalPayment: number;
  totalInterest: number;
}

/** Monthly payment for a fixed-rate, fully amortizing loan. */
export function mortgagePayment(
  principal: number,
  annualRatePercent: number,
  years: number,
): FinanceResult<MortgagePaymentResult> {
  const invalid = requireFinite({
    "loan amount": principal,
    "interest rate": annualRatePercent,
    years,
  });
  if (invalid) return invalid;
  if (principal <= 0) {
    return { ok: false, message: "Loan amount must be greater than 0." };
  }
  if (annualRatePercent < 0) {
    return { ok: false, message: "Interest rate can't be negative." };
  }
  if (years <= 0) {
    return { ok: false, message: "Term must be greater than 0 years." };
  }

  const monthlyRate = annualRatePercent / 100 / 12;
  const totalMonths = years * 12;
  const monthlyPayment =
    monthlyRate === 0
      ? principal / totalMonths
      : (monthlyRate * principal) /
        (1 - Math.pow(1 + monthlyRate, -totalMonths));
  const totalPayment = monthlyPayment * totalMonths;

  return {
    ok: true,
    value: {
      monthlyPayment,
      totalPayment,
      totalInterest: totalPayment - principal,
    },
  };
}

export interface AmortizationRow {
  month: number;
  payment: number;
  interest: number;
  principal: number;
  remaining: number;
}

export interface AmortizationResult extends MortgagePaymentResult {
  schedule: AmortizationRow[];
}

/** Full month-by-month amortization schedule for a fixed-rate loan. */
export function amortizationSchedule(
  principal: number,
  annualRatePercent: number,
  years: number,
): FinanceResult<AmortizationResult> {
  const base = mortgagePayment(principal, annualRatePercent, years);
  if (!base.ok) return base;

  const monthlyRate = annualRatePercent / 100 / 12;
  const totalMonths = Math.round(years * 12);
  const { monthlyPayment } = base.value;

  const schedule: AmortizationRow[] = [];
  let balance = principal;
  for (let month = 1; month <= totalMonths; month++) {
    const interest = balance * monthlyRate;
    let principalPaid = monthlyPayment - interest;
    if (principalPaid > balance) principalPaid = balance;
    balance = Math.max(0, balance - principalPaid);
    schedule.push({
      month,
      payment: monthlyPayment,
      interest,
      principal: principalPaid,
      remaining: balance,
    });
  }

  return { ok: true, value: { ...base.value, schedule } };
}

/** Loan amount as a percentage of the asset/property value it's secured by. */
export function loanToValue(
  loanAmount: number,
  assetValue: number,
): FinanceResult<{ ltvPercent: number }> {
  const invalid = requireFinite({
    "loan amount": loanAmount,
    "asset value": assetValue,
  });
  if (invalid) return invalid;
  if (loanAmount < 0) {
    return { ok: false, message: "Loan amount can't be negative." };
  }
  if (assetValue <= 0) {
    return { ok: false, message: "Asset value must be greater than 0." };
  }
  return { ok: true, value: { ltvPercent: (loanAmount / assetValue) * 100 } };
}

export interface LoanRateEntry {
  principal: number;
  ratePercent: number;
}

/** Principal-weighted average interest rate across multiple loans. */
export function weightedAverageRate(
  loans: LoanRateEntry[],
): FinanceResult<{ weightedRatePercent: number }> {
  const valid = loans.filter((l) => Number.isFinite(l.principal) && l.principal > 0);
  const totalPrincipal = valid.reduce((sum, l) => sum + l.principal, 0);
  if (totalPrincipal <= 0) {
    return {
      ok: false,
      message: "Enter at least one loan with a principal greater than 0.",
    };
  }
  const weightedSum = valid.reduce(
    (sum, l) => sum + l.principal * (Number.isFinite(l.ratePercent) ? l.ratePercent : 0),
    0,
  );
  return {
    ok: true,
    value: { weightedRatePercent: weightedSum / totalPrincipal },
  };
}

export interface LoanMaturityEntry {
  principal: number;
  years: number;
}

/** Principal-weighted average maturity (in years) across multiple loans. */
export function weightedAverageMaturity(
  loans: LoanMaturityEntry[],
): FinanceResult<{ weightedYears: number }> {
  const valid = loans.filter((l) => Number.isFinite(l.principal) && l.principal > 0);
  const totalPrincipal = valid.reduce((sum, l) => sum + l.principal, 0);
  if (totalPrincipal <= 0) {
    return {
      ok: false,
      message: "Enter at least one loan with a principal greater than 0.",
    };
  }
  const weightedSum = valid.reduce(
    (sum, l) => sum + l.principal * (Number.isFinite(l.years) ? l.years : 0),
    0,
  );
  return { ok: true, value: { weightedYears: weightedSum / totalPrincipal } };
}

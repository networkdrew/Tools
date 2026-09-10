import { requireFinite, type FinanceResult } from "./types";

export const CURRENCIES = ["USD", "EUR", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];

/** Approximate exchange rates (relative to USD = 1). Not live data. */
const EXCHANGE_RATES_TO_USD: Record<Currency, number> = {
  USD: 1.0,
  EUR: 0.94,
  GBP: 0.83,
};

/** Converts an amount between currencies using fixed, approximate rates. */
export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency,
): FinanceResult<{ converted: number }> {
  const invalid = requireFinite({ amount });
  if (invalid) return invalid;
  const amountInUsd = amount / EXCHANGE_RATES_TO_USD[from];
  return { ok: true, value: { converted: amountInUsd * EXCHANGE_RATES_TO_USD[to] } };
}

/** Converts a nominal annual rate and compounding frequency into an effective annual rate. */
export function effectiveAnnualRate(
  nominalRatePercent: number,
  compoundingPeriodsPerYear: number,
): FinanceResult<{ earPercent: number }> {
  const invalid = requireFinite({
    "nominal rate": nominalRatePercent,
    "compounding periods per year": compoundingPeriodsPerYear,
  });
  if (invalid) return invalid;
  if (compoundingPeriodsPerYear <= 0) {
    return {
      ok: false,
      message: "Compounding periods per year must be greater than 0.",
    };
  }
  const nominal = nominalRatePercent / 100;
  const ear =
    Math.pow(1 + nominal / compoundingPeriodsPerYear, compoundingPeriodsPerYear) - 1;
  return { ok: true, value: { earPercent: ear * 100 } };
}

/** Weighted average cost of capital: (E/V * Re) + (D/V * Rd * (1 - tax)). */
export function weightedAverageCostOfCapital(
  equityValue: number,
  debtValue: number,
  costOfEquityPercent: number,
  costOfDebtPercent: number,
  taxRatePercent: number,
): FinanceResult<{ waccPercent: number }> {
  const invalid = requireFinite({
    "equity value": equityValue,
    "debt value": debtValue,
    "cost of equity": costOfEquityPercent,
    "cost of debt": costOfDebtPercent,
    "tax rate": taxRatePercent,
  });
  if (invalid) return invalid;
  if (equityValue < 0 || debtValue < 0) {
    return { ok: false, message: "Equity and debt value can't be negative." };
  }
  const totalValue = equityValue + debtValue;
  if (totalValue <= 0) {
    return { ok: false, message: "Equity plus debt must be greater than 0." };
  }
  const equityShare = equityValue / totalValue;
  const debtShare = debtValue / totalValue;
  const wacc =
    equityShare * (costOfEquityPercent / 100) +
    debtShare * (costOfDebtPercent / 100) * (1 - taxRatePercent / 100);
  return { ok: true, value: { waccPercent: wacc * 100 } };
}

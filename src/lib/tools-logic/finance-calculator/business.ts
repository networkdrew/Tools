import { requireFinite, type FinanceResult } from "./types";

/** Percentage gain or loss of an investment, plus the raw gain/loss amount. */
export function returnOnInvestment(
  initialInvestment: number,
  finalValue: number,
): FinanceResult<{ roiPercent: number; gain: number }> {
  const invalid = requireFinite({
    "initial investment": initialInvestment,
    "final value": finalValue,
  });
  if (invalid) return invalid;
  if (initialInvestment === 0) {
    return { ok: false, message: "Initial investment can't be zero." };
  }
  const gain = finalValue - initialInvestment;
  return {
    ok: true,
    value: { roiPercent: (gain / initialInvestment) * 100, gain },
  };
}

/** Units that must be sold for total revenue to equal total cost. */
export function breakEvenUnits(
  fixedCosts: number,
  pricePerUnit: number,
  variableCostPerUnit: number,
): FinanceResult<{ units: number }> {
  const invalid = requireFinite({
    "fixed costs": fixedCosts,
    "price per unit": pricePerUnit,
    "variable cost per unit": variableCostPerUnit,
  });
  if (invalid) return invalid;
  if (fixedCosts < 0) {
    return { ok: false, message: "Fixed costs can't be negative." };
  }
  if (pricePerUnit <= variableCostPerUnit) {
    return {
      ok: false,
      message: "Price per unit must exceed variable cost per unit to break even.",
    };
  }
  return {
    ok: true,
    value: { units: fixedCosts / (pricePerUnit - variableCostPerUnit) },
  };
}

/** Monthly debt payments as a percentage of gross monthly income. */
export function debtToIncome(
  monthlyDebt: number,
  monthlyIncome: number,
): FinanceResult<{ dtiPercent: number }> {
  const invalid = requireFinite({
    "monthly debt": monthlyDebt,
    "monthly income": monthlyIncome,
  });
  if (invalid) return invalid;
  if (monthlyDebt < 0) {
    return { ok: false, message: "Monthly debt payments can't be negative." };
  }
  if (monthlyIncome <= 0) {
    return { ok: false, message: "Monthly gross income must be greater than 0." };
  }
  return { ok: true, value: { dtiPercent: (monthlyDebt / monthlyIncome) * 100 } };
}

/** Net operating income divided by total annual debt service. */
export function debtServiceCoverageRatio(
  netOperatingIncome: number,
  annualDebtService: number,
): FinanceResult<{ dscr: number }> {
  const invalid = requireFinite({
    "net operating income": netOperatingIncome,
    "annual debt service": annualDebtService,
  });
  if (invalid) return invalid;
  if (annualDebtService <= 0) {
    return { ok: false, message: "Annual debt service must be greater than 0." };
  }
  return { ok: true, value: { dscr: netOperatingIncome / annualDebtService } };
}

/** Mark-up (over cost) and gross margin (of price), given cost and selling price. */
export function markupAndMargin(
  cost: number,
  price: number,
): FinanceResult<{ markupPercent: number; marginPercent: number }> {
  const invalid = requireFinite({ cost, price });
  if (invalid) return invalid;
  if (cost <= 0 || price <= 0) {
    return { ok: false, message: "Cost and price must both be greater than 0." };
  }
  return {
    ok: true,
    value: {
      markupPercent: ((price - cost) / cost) * 100,
      marginPercent: ((price - cost) / price) * 100,
    },
  };
}

/** Current ratio and quick (acid-test) ratio from balance-sheet figures. */
export function currentAndQuickRatio(
  currentAssets: number,
  inventory: number,
  currentLiabilities: number,
): FinanceResult<{ currentRatio: number; quickRatio: number }> {
  const invalid = requireFinite({
    "current assets": currentAssets,
    inventory,
    "current liabilities": currentLiabilities,
  });
  if (invalid) return invalid;
  if (currentAssets < 0 || inventory < 0) {
    return { ok: false, message: "Current assets and inventory can't be negative." };
  }
  if (currentLiabilities <= 0) {
    return { ok: false, message: "Current liabilities must be greater than 0." };
  }
  return {
    ok: true,
    value: {
      currentRatio: currentAssets / currentLiabilities,
      quickRatio: (currentAssets - inventory) / currentLiabilities,
    },
  };
}

export interface EbitdaResult {
  ebitda: number;
  debtToEbitda: number | null;
}

/** EBITDA (from revenue and costs) and the resulting Debt/EBITDA ratio. */
export function ebitdaAndDebtRatio(
  revenue: number,
  operatingCosts: number,
  depreciationAndAmortization: number,
  interestExpense: number,
  taxes: number,
  totalDebt: number,
): FinanceResult<EbitdaResult> {
  const invalid = requireFinite({
    revenue,
    "operating costs": operatingCosts,
    "depreciation and amortization": depreciationAndAmortization,
    "interest expense": interestExpense,
    taxes,
    "total debt": totalDebt,
  });
  if (invalid) return invalid;

  const netIncome =
    revenue - operatingCosts - depreciationAndAmortization - interestExpense - taxes;
  const ebitda = netIncome + interestExpense + taxes + depreciationAndAmortization;
  return {
    ok: true,
    value: { ebitda, debtToEbitda: ebitda === 0 ? null : totalDebt / ebitda },
  };
}

/** Average days it takes to collect payment after a credit sale. */
export function daysSalesOutstanding(
  averageAccountsReceivable: number,
  totalCreditSales: number,
): FinanceResult<{ days: number }> {
  const invalid = requireFinite({
    "average accounts receivable": averageAccountsReceivable,
    "total credit sales": totalCreditSales,
  });
  if (invalid) return invalid;
  if (totalCreditSales <= 0) {
    return { ok: false, message: "Total credit sales must be greater than 0." };
  }
  return {
    ok: true,
    value: { days: (averageAccountsReceivable / totalCreditSales) * 365 },
  };
}

/** Average days a company takes to pay its own suppliers. */
export function daysPayableOutstanding(
  averageAccountsPayable: number,
  costOfGoodsSold: number,
): FinanceResult<{ days: number }> {
  const invalid = requireFinite({
    "average accounts payable": averageAccountsPayable,
    "cost of goods sold": costOfGoodsSold,
  });
  if (invalid) return invalid;
  if (costOfGoodsSold <= 0) {
    return { ok: false, message: "Cost of goods sold must be greater than 0." };
  }
  return {
    ok: true,
    value: { days: (averageAccountsPayable / costOfGoodsSold) * 365 },
  };
}

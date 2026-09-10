import { useState } from "react";
import { NumberField } from "./NumberField";
import { StatusMessage } from "@/components/react/StatusMessage";
import { buttonGhost, buttonPrimary } from "@/components/react/styles";
import type { FinanceResult } from "@/lib/tools-logic/finance-calculator/types";
import { loanToValue, mortgagePayment } from "@/lib/tools-logic/finance-calculator/loans";
import {
  bondPrice,
  bondYieldToMaturity,
  treasuryBillYield,
} from "@/lib/tools-logic/finance-calculator/bonds";
import {
  compoundInterest,
  inflationFutureValue,
  retirementFutureValue,
  simpleInterest,
} from "@/lib/tools-logic/finance-calculator/investment";
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
} from "@/lib/tools-logic/finance-calculator/business";
import {
  effectiveAnnualRate,
  weightedAverageCostOfCapital,
} from "@/lib/tools-logic/finance-calculator/misc";
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  formatRatioOrUndefined,
  formatSuffixed,
} from "./format";

type ResultValues = Record<string, number | null>;

/** Reads a parsed-input array by index, defaulting a missing slot to NaN
 *  (which every logic function's own validation then rejects with a real
 *  error message) instead of letting `undefined` reach the math. */
function numAt(values: number[], index: number): number {
  return values[index] ?? NaN;
}

interface NumericFieldConfig {
  key: string;
  label: string;
  placeholder?: string;
  step?: string;
}

interface ResultFieldConfig {
  key: string;
  label: string;
  format: (value: number | null) => string;
}

export interface GenericCalculatorConfig {
  id: string;
  label: string;
  fields: NumericFieldConfig[];
  compute: (values: number[]) => FinanceResult<ResultValues>;
  results: ResultFieldConfig[];
}

/** Every "plug numbers in, get numbers out" calculator, driven from one
 *  config array instead of 20 near-identical components. Calculators that
 *  need a different shape of input (cash-flow lists, dynamic loan rows,
 *  currency pickers) get their own dedicated component instead. */
export const genericCalculators: GenericCalculatorConfig[] = [
  {
    id: "mortgage",
    label: "Mortgage Payment",
    fields: [
      { key: "principal", label: "Loan Amount (Principal)", placeholder: "300000" },
      { key: "rate", label: "Annual Interest Rate (%)", placeholder: "4.0", step: "0.01" },
      { key: "years", label: "Term (Years)", placeholder: "30" },
    ],
    compute: (v) =>
      mortgagePayment(numAt(v, 0), numAt(v, 1), numAt(v, 2)) as FinanceResult<ResultValues>,
    results: [
      { key: "monthlyPayment", label: "Monthly Payment", format: (n) => formatCurrency(n ?? 0) },
      { key: "totalPayment", label: "Total Payments", format: (n) => formatCurrency(n ?? 0) },
      { key: "totalInterest", label: "Total Interest", format: (n) => formatCurrency(n ?? 0) },
    ],
  },
  {
    id: "ltv",
    label: "Loan-to-Value (LTV)",
    fields: [
      { key: "loanAmount", label: "Loan Amount", placeholder: "200000" },
      { key: "assetValue", label: "Asset/Property Value", placeholder: "250000" },
    ],
    compute: (v) => loanToValue(numAt(v, 0), numAt(v, 1)),
    results: [{ key: "ltvPercent", label: "LTV Ratio", format: (n) => formatPercent(2)(n ?? 0) }],
  },
  {
    id: "compoundInterest",
    label: "Compound Interest",
    fields: [
      { key: "principal", label: "Principal (Initial Amount)", placeholder: "5000" },
      { key: "rate", label: "Annual Interest Rate (%)", placeholder: "5.0", step: "0.01" },
      { key: "timesPerYear", label: "Times Compounded per Year", placeholder: "12" },
      { key: "years", label: "Number of Years", placeholder: "10" },
    ],
    compute: (v) => compoundInterest(numAt(v, 0), numAt(v, 1), numAt(v, 2), numAt(v, 3)),
    results: [{ key: "finalAmount", label: "Final Amount", format: (n) => formatCurrency(n ?? 0) }],
  },
  {
    id: "simpleInterest",
    label: "Simple Interest",
    fields: [
      { key: "principal", label: "Principal (Initial Amount)", placeholder: "1000" },
      { key: "rate", label: "Annual Interest Rate (%)", placeholder: "5.0", step: "0.01" },
      { key: "years", label: "Time in Years", placeholder: "2" },
    ],
    compute: (v) => simpleInterest(numAt(v, 0), numAt(v, 1), numAt(v, 2)),
    results: [
      { key: "interest", label: "Interest", format: (n) => formatCurrency(n ?? 0) },
      { key: "total", label: "Total", format: (n) => formatCurrency(n ?? 0) },
    ],
  },
  {
    id: "inflation",
    label: "Inflation",
    fields: [
      { key: "amount", label: "Initial Amount", placeholder: "1000" },
      { key: "rate", label: "Annual Inflation Rate (%)", placeholder: "3.0", step: "0.01" },
      { key: "years", label: "Number of Years", placeholder: "10" },
    ],
    compute: (v) => inflationFutureValue(numAt(v, 0), numAt(v, 1), numAt(v, 2)),
    results: [{ key: "futureValue", label: "Future Value", format: (n) => formatCurrency(n ?? 0) }],
  },
  {
    id: "retirement",
    label: "Retirement (Monthly Contributions)",
    fields: [
      { key: "monthly", label: "Monthly Contribution", placeholder: "500" },
      { key: "rate", label: "Annual Interest Rate (%)", placeholder: "6.0", step: "0.01" },
      { key: "years", label: "Number of Years", placeholder: "20" },
    ],
    compute: (v) => retirementFutureValue(numAt(v, 0), numAt(v, 1), numAt(v, 2)),
    results: [{ key: "futureValue", label: "Future Value", format: (n) => formatCurrency(n ?? 0) }],
  },
  {
    id: "bondPrice",
    label: "Bond Pricing",
    fields: [
      { key: "faceValue", label: "Face Value (Par)", placeholder: "1000" },
      { key: "coupon", label: "Annual Coupon Rate (%)", placeholder: "5.0", step: "0.01" },
      { key: "marketYield", label: "Market Yield (%)", placeholder: "6.0", step: "0.01" },
      { key: "years", label: "Years to Maturity", placeholder: "10" },
    ],
    compute: (v) => bondPrice(numAt(v, 0), numAt(v, 1), numAt(v, 2), numAt(v, 3)),
    results: [{ key: "price", label: "Bond Price", format: (n) => formatCurrency(n ?? 0) }],
  },
  {
    id: "bondYTM",
    label: "Yield to Maturity (YTM)",
    fields: [
      { key: "currentPrice", label: "Current Bond Price", placeholder: "950" },
      { key: "faceValue", label: "Face Value (Par)", placeholder: "1000" },
      { key: "coupon", label: "Annual Coupon Rate (% of Face)", placeholder: "5.0", step: "0.01" },
      { key: "years", label: "Years to Maturity", placeholder: "10" },
    ],
    compute: (v) => bondYieldToMaturity(numAt(v, 0), numAt(v, 1), numAt(v, 2), numAt(v, 3)),
    results: [{ key: "ytmPercent", label: "Approx. YTM", format: (n) => formatPercent(4)(n ?? 0) }],
  },
  {
    id: "tBillYield",
    label: "Treasury Bill Discount Yield",
    fields: [
      { key: "faceValue", label: "Face Value", placeholder: "100000" },
      { key: "purchasePrice", label: "Purchase Price", placeholder: "98000" },
      { key: "days", label: "Days to Maturity", placeholder: "90" },
    ],
    compute: (v) => treasuryBillYield(numAt(v, 0), numAt(v, 1), numAt(v, 2)),
    results: [
      { key: "discountYieldPercent", label: "Discount Yield", format: (n) => formatPercent(3)(n ?? 0) },
    ],
  },
  {
    id: "roi",
    label: "Return on Investment (ROI)",
    fields: [
      { key: "initial", label: "Initial Investment", placeholder: "1000" },
      { key: "finalValue", label: "Final Value", placeholder: "1500" },
    ],
    compute: (v) => returnOnInvestment(numAt(v, 0), numAt(v, 1)),
    results: [
      { key: "roiPercent", label: "ROI", format: (n) => formatPercent(2)(n ?? 0) },
      { key: "gain", label: "Gain/Loss", format: (n) => formatCurrency(n ?? 0) },
    ],
  },
  {
    id: "breakEven",
    label: "Break-Even Point",
    fields: [
      { key: "fixedCosts", label: "Fixed Costs", placeholder: "5000" },
      { key: "price", label: "Price per Unit", placeholder: "100" },
      { key: "variableCost", label: "Variable Cost per Unit", placeholder: "60" },
    ],
    compute: (v) => breakEvenUnits(numAt(v, 0), numAt(v, 1), numAt(v, 2)),
    results: [
      { key: "units", label: "Break-Even Point", format: (n) => formatSuffixed(2, "units")(n ?? 0) },
    ],
  },
  {
    id: "dti",
    label: "Debt-to-Income (DTI)",
    fields: [
      { key: "monthlyDebt", label: "Total Monthly Debt Payments", placeholder: "1500" },
      { key: "monthlyIncome", label: "Monthly Gross Income", placeholder: "5000" },
    ],
    compute: (v) => debtToIncome(numAt(v, 0), numAt(v, 1)),
    results: [{ key: "dtiPercent", label: "DTI Ratio", format: (n) => formatPercent(2)(n ?? 0) }],
  },
  {
    id: "dscr",
    label: "Debt Service Coverage Ratio (DSCR)",
    fields: [
      { key: "noi", label: "Net Operating Income (Annual)", placeholder: "60000" },
      { key: "debtService", label: "Annual Debt Service", placeholder: "40000" },
    ],
    compute: (v) => debtServiceCoverageRatio(numAt(v, 0), numAt(v, 1)),
    results: [{ key: "dscr", label: "DSCR", format: (n) => formatNumber(2)(n ?? 0) }],
  },
  {
    id: "markupMargin",
    label: "Mark-up & Margin",
    fields: [
      { key: "cost", label: "Cost per Unit", placeholder: "60" },
      { key: "price", label: "Selling Price per Unit", placeholder: "100" },
    ],
    compute: (v) => markupAndMargin(numAt(v, 0), numAt(v, 1)),
    results: [
      { key: "markupPercent", label: "Mark-up", format: (n) => formatPercent(2)(n ?? 0) },
      { key: "marginPercent", label: "Margin", format: (n) => formatPercent(2)(n ?? 0) },
    ],
  },
  {
    id: "liquidityRatios",
    label: "Current & Quick Ratio",
    fields: [
      { key: "currentAssets", label: "Current Assets", placeholder: "50000" },
      { key: "inventory", label: "Inventory", placeholder: "20000" },
      { key: "currentLiabilities", label: "Current Liabilities", placeholder: "30000" },
    ],
    compute: (v) => currentAndQuickRatio(numAt(v, 0), numAt(v, 1), numAt(v, 2)),
    results: [
      { key: "currentRatio", label: "Current Ratio", format: (n) => formatNumber(2)(n ?? 0) },
      { key: "quickRatio", label: "Quick Ratio", format: (n) => formatNumber(2)(n ?? 0) },
    ],
  },
  {
    id: "ebitda",
    label: "EBITDA & Debt/EBITDA",
    fields: [
      { key: "revenue", label: "Revenue (Annual)", placeholder: "200000" },
      { key: "opCosts", label: "Operating Costs (excl. D&A)", placeholder: "120000" },
      { key: "depAmort", label: "Depreciation & Amortization", placeholder: "10000" },
      { key: "interest", label: "Interest Expense", placeholder: "5000" },
      { key: "taxes", label: "Taxes", placeholder: "10000" },
      { key: "totalDebt", label: "Total Debt", placeholder: "200000" },
    ],
    compute: (v) =>
      ebitdaAndDebtRatio(
        numAt(v, 0),
        numAt(v, 1),
        numAt(v, 2),
        numAt(v, 3),
        numAt(v, 4),
        numAt(v, 5),
      ) as FinanceResult<ResultValues>,
    results: [
      { key: "ebitda", label: "EBITDA", format: (n) => formatCurrency(n ?? 0) },
      { key: "debtToEbitda", label: "Debt/EBITDA", format: formatRatioOrUndefined(2) },
    ],
  },
  {
    id: "dso",
    label: "Days Sales Outstanding (DSO)",
    fields: [
      { key: "avgAR", label: "Average A/R", placeholder: "50000" },
      { key: "creditSales", label: "Total Credit Sales (Annual)", placeholder: "600000" },
    ],
    compute: (v) => daysSalesOutstanding(numAt(v, 0), numAt(v, 1)),
    results: [{ key: "days", label: "DSO", format: (n) => formatSuffixed(2, "days")(n ?? 0) }],
  },
  {
    id: "dpo",
    label: "Days Payable Outstanding (DPO)",
    fields: [
      { key: "avgAP", label: "Average A/P", placeholder: "40000" },
      { key: "cogs", label: "Cost of Goods Sold (Annual)", placeholder: "300000" },
    ],
    compute: (v) => daysPayableOutstanding(numAt(v, 0), numAt(v, 1)),
    results: [{ key: "days", label: "DPO", format: (n) => formatSuffixed(2, "days")(n ?? 0) }],
  },
  {
    id: "ear",
    label: "Effective Annual Rate (EAR)",
    fields: [
      { key: "nominal", label: "Nominal Annual Rate (%)", placeholder: "10.0", step: "0.01" },
      { key: "periods", label: "Compounding Periods/Year", placeholder: "12" },
    ],
    compute: (v) => effectiveAnnualRate(numAt(v, 0), numAt(v, 1)),
    results: [
      { key: "earPercent", label: "Effective Annual Rate", format: (n) => formatPercent(4)(n ?? 0) },
    ],
  },
  {
    id: "wacc",
    label: "Weighted Average Cost of Capital (WACC)",
    fields: [
      { key: "equity", label: "Equity Value (E)", placeholder: "500000" },
      { key: "debt", label: "Debt Value (D)", placeholder: "500000" },
      { key: "costOfEquity", label: "Cost of Equity (%)", placeholder: "12.0", step: "0.01" },
      { key: "costOfDebt", label: "Cost of Debt (%)", placeholder: "6.0", step: "0.01" },
      { key: "taxRate", label: "Tax Rate (%)", placeholder: "25.0", step: "0.01" },
    ],
    compute: (v) => weightedAverageCostOfCapital(numAt(v, 0), numAt(v, 1), numAt(v, 2), numAt(v, 3), numAt(v, 4)),
    results: [{ key: "waccPercent", label: "WACC", format: (n) => formatPercent(2)(n ?? 0) }],
  },
];

export function GenericCalculator({ config }: { config: GenericCalculatorConfig }) {
  const [values, setValues] = useState<string[]>(() => config.fields.map(() => ""));
  const [result, setResult] = useState<ResultValues | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    const numbers = values.map((v) => (v.trim() === "" ? NaN : Number(v)));
    const outcome = config.compute(numbers);
    if (outcome.ok) {
      setResult(outcome.value);
      setError(null);
    } else {
      setResult(null);
      setError(outcome.message);
    }
  }

  function reset() {
    setValues(config.fields.map(() => ""));
    setResult(null);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {config.fields.map((field, i) => (
          <NumberField
            key={field.key}
            label={field.label}
            value={values[i] ?? ""}
            onChange={(v) =>
              setValues((prev) => prev.map((p, idx) => (idx === i ? v : p)))
            }
            placeholder={field.placeholder}
            step={field.step}
          />
        ))}
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={run} className={buttonPrimary}>
          Calculate
        </button>
        <button type="button" onClick={reset} className={buttonGhost}>
          Reset
        </button>
      </div>
      {error && <StatusMessage tone="error">{error}</StatusMessage>}
      {result && (
        <dl className="border-border bg-bg-sunken flex flex-col gap-2 rounded-md border p-4">
          {config.results.map((r) => (
            <div
              key={r.key}
              className="flex items-baseline justify-between gap-4"
            >
              <dt className="text-text-muted text-sm">{r.label}</dt>
              <dd className="text-text font-mono text-sm font-semibold">
                {r.format(result[r.key] ?? null)}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

import { useId, useState } from "react";
import { selectField } from "@/components/react/styles";
import { genericCalculators, GenericCalculator } from "./finance-calculator/GenericCalculator";
import { AmortizationCalculator } from "./finance-calculator/AmortizationCalculator";
import { IrrCalculator, NpvCalculator } from "./finance-calculator/CashFlowCalculator";
import { PaybackCalculator } from "./finance-calculator/PaybackCalculator";
import {
  WeightedMaturityCalculator,
  WeightedRateCalculator,
} from "./finance-calculator/WeightedLoanCalculator";
import { CurrencyConverter } from "./finance-calculator/CurrencyConverter";

const specialLabels: Record<string, string> = {
  amortization: "Loan Amortization",
  weightedLoanRate: "Weighted Avg Interest Rate (Loans)",
  weightedLoanMaturity: "Weighted Average Maturity (Loans)",
  payback: "Payback Period",
  npv: "Net Present Value (NPV)",
  irr: "Internal Rate of Return (IRR)",
  currencyConversion: "Currency Conversion",
};

const genericLabels: Record<string, string> = Object.fromEntries(
  genericCalculators.map((c) => [c.id, c.label]),
);

const allLabels: Record<string, string> = { ...genericLabels, ...specialLabels };

const categories: { name: string; ids: string[] }[] = [
  {
    name: "Loan & Mortgage Calculators",
    ids: ["mortgage", "amortization", "ltv", "weightedLoanRate", "weightedLoanMaturity"],
  },
  {
    name: "Investment & Time Value of Money",
    ids: [
      "compoundInterest",
      "simpleInterest",
      "inflation",
      "retirement",
      "payback",
      "npv",
      "irr",
    ],
  },
  {
    name: "Bond & Security Tools",
    ids: ["bondPrice", "bondYTM", "tBillYield"],
  },
  {
    name: "Business & Ratios",
    ids: [
      "roi",
      "breakEven",
      "dti",
      "dscr",
      "markupMargin",
      "liquidityRatios",
      "ebitda",
      "dso",
      "dpo",
    ],
  },
  {
    name: "Misc Tools",
    ids: ["currencyConversion", "ear", "wacc"],
  },
];

function renderCalculator(id: string) {
  switch (id) {
    case "amortization":
      return <AmortizationCalculator />;
    case "weightedLoanRate":
      return <WeightedRateCalculator />;
    case "weightedLoanMaturity":
      return <WeightedMaturityCalculator />;
    case "payback":
      return <PaybackCalculator />;
    case "npv":
      return <NpvCalculator />;
    case "irr":
      return <IrrCalculator />;
    case "currencyConversion":
      return <CurrencyConverter />;
    default: {
      const config = genericCalculators.find((c) => c.id === id);
      return config ? <GenericCalculator config={config} /> : null;
    }
  }
}

export default function FinanceCalculatorTool() {
  const [activeId, setActiveId] = useState<string>("mortgage");
  const selectId = useId();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={selectId} className="text-text text-sm font-medium">
          Choose Calculator
        </label>
        <select
          id={selectId}
          value={activeId}
          onChange={(e) => setActiveId(e.target.value)}
          className={selectField}
        >
          {categories.map((category) => (
            <optgroup key={category.name} label={category.name}>
              {category.ids.map((id) => (
                <option key={id} value={id}>
                  {allLabels[id]}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      <div key={activeId} className="border-border-strong border-t pt-6">
        <h2 className="text-text mb-4 text-lg font-semibold">
          {allLabels[activeId]}
        </h2>
        {renderCalculator(activeId)}
      </div>
    </div>
  );
}

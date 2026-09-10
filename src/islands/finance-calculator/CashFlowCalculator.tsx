import { useId, useState } from "react";
import { NumberField } from "./NumberField";
import { StatusMessage } from "@/components/react/StatusMessage";
import {
  buttonGhost,
  buttonPrimary,
  labelText,
  textareaField,
} from "@/components/react/styles";
import type { FinanceResult } from "@/lib/tools-logic/finance-calculator/types";
import {
  internalRateOfReturn,
  netPresentValue,
} from "@/lib/tools-logic/finance-calculator/investment";
import { formatCurrency, formatPercent } from "./format";

/** Parses a comma-separated list of cash flows. Blank entries between commas
 *  (e.g. a trailing comma) are ignored rather than treated as 0. */
function parseCashFlows(input: string): number[] | null {
  const parts = input
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p.length > 0);
  if (parts.length === 0) return null;
  return parts.map((p) => Number(p));
}

interface CashFlowFieldProps {
  value: string;
  onChange: (v: string) => void;
}

function CashFlowField({ value, onChange }: CashFlowFieldProps) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelText}>
        Cash Flows (comma separated)
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        placeholder="-1000, 200, 300, 500"
        className={textareaField}
      />
    </div>
  );
}

export function NpvCalculator() {
  const [flows, setFlows] = useState("");
  const [rate, setRate] = useState("");
  const [result, setResult] = useState<{ npv: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    const parsed = parseCashFlows(flows);
    if (parsed === null) {
      setResult(null);
      setError("Please enter at least one cash flow.");
      return;
    }
    const rateNumber = rate.trim() === "" ? NaN : Number(rate);
    const outcome = netPresentValue(parsed, rateNumber);
    report(outcome);
  }

  function report(outcome: FinanceResult<{ npv: number }>) {
    if (outcome.ok) {
      setResult(outcome.value);
      setError(null);
    } else {
      setResult(null);
      setError(outcome.message);
    }
  }

  function reset() {
    setFlows("");
    setRate("");
    setResult(null);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <NumberField
        label="Discount Rate (%)"
        value={rate}
        onChange={setRate}
        placeholder="10.0"
        step="0.01"
      />
      <CashFlowField value={flows} onChange={setFlows} />
      <div className="flex gap-3">
        <button type="button" onClick={run} className={buttonPrimary}>
          Calculate NPV
        </button>
        <button type="button" onClick={reset} className={buttonGhost}>
          Reset
        </button>
      </div>
      {error && <StatusMessage tone="error">{error}</StatusMessage>}
      {result && (
        <StatusMessage tone="success">
          NPV: {formatCurrency(result.npv)}
        </StatusMessage>
      )}
    </div>
  );
}

export function IrrCalculator() {
  const [flows, setFlows] = useState("");
  const [result, setResult] = useState<{ irrPercent: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    const parsed = parseCashFlows(flows);
    if (parsed === null) {
      setResult(null);
      setError("Please enter at least one cash flow.");
      return;
    }
    const outcome = internalRateOfReturn(parsed);
    if (outcome.ok) {
      setResult(outcome.value);
      setError(null);
    } else {
      setResult(null);
      setError(outcome.message);
    }
  }

  function reset() {
    setFlows("");
    setResult(null);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <CashFlowField value={flows} onChange={setFlows} />
      <div className="flex gap-3">
        <button type="button" onClick={run} className={buttonPrimary}>
          Calculate IRR
        </button>
        <button type="button" onClick={reset} className={buttonGhost}>
          Reset
        </button>
      </div>
      {error && <StatusMessage tone="error">{error}</StatusMessage>}
      {result && (
        <StatusMessage tone="success">
          Approx. IRR: {formatPercent(4)(result.irrPercent)}
        </StatusMessage>
      )}
    </div>
  );
}

export { parseCashFlows, CashFlowField };

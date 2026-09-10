import { useState } from "react";
import { CashFlowField, parseCashFlows } from "./CashFlowCalculator";
import { StatusMessage } from "@/components/react/StatusMessage";
import { buttonGhost, buttonPrimary } from "@/components/react/styles";
import { paybackPeriod } from "@/lib/tools-logic/finance-calculator/investment";

export function PaybackCalculator() {
  const [flows, setFlows] = useState("");
  const [result, setResult] = useState<{
    recovered: boolean;
    years: number | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    const parsed = parseCashFlows(flows);
    if (parsed === null) {
      setResult(null);
      setError("Please enter at least one cash flow.");
      return;
    }
    const outcome = paybackPeriod(parsed);
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
          Calculate Payback Period
        </button>
        <button type="button" onClick={reset} className={buttonGhost}>
          Reset
        </button>
      </div>
      {error && <StatusMessage tone="error">{error}</StatusMessage>}
      {result &&
        (result.recovered && result.years !== null ? (
          <StatusMessage tone="success">
            Payback Period: ~{result.years.toFixed(2)} year(s)
          </StatusMessage>
        ) : (
          <StatusMessage tone="neutral">
            Investment not fully recovered in the given cash flows.
          </StatusMessage>
        ))}
    </div>
  );
}

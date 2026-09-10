import { useId, useState } from "react";
import { StatusMessage } from "@/components/react/StatusMessage";
import {
  buttonGhost,
  buttonPrimary,
  labelText,
  textField,
} from "@/components/react/styles";
import type { FinanceResult } from "@/lib/tools-logic/finance-calculator/types";
import {
  weightedAverageMaturity,
  weightedAverageRate,
} from "@/lib/tools-logic/finance-calculator/loans";

interface Row {
  id: number;
  principal: string;
  secondary: string;
}

let nextRowId = 1;
function emptyRow(): Row {
  return { id: nextRowId++, principal: "", secondary: "" };
}

interface WeightedLoanCalculatorProps {
  secondColumnLabel: string;
  secondColumnPlaceholder: string;
  buttonLabel: string;
  compute: (
    rows: { principal: number; secondary: number }[],
  ) => FinanceResult<Record<string, number>>;
  formatResult: (value: Record<string, number>) => string;
}

function RowFields({
  row,
  secondColumnLabel,
  secondColumnPlaceholder,
  onChange,
  onRemove,
}: {
  row: Row;
  secondColumnLabel: string;
  secondColumnPlaceholder: string;
  onChange: (row: Row) => void;
  onRemove: () => void;
}) {
  const principalId = useId();
  const secondaryId = useId();
  return (
    <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={principalId} className={labelText}>
          Principal
        </label>
        <input
          id={principalId}
          type="number"
          inputMode="decimal"
          value={row.principal}
          onChange={(e) => onChange({ ...row, principal: e.target.value })}
          placeholder="Principal"
          className={textField}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={secondaryId} className={labelText}>
          {secondColumnLabel}
        </label>
        <input
          id={secondaryId}
          type="number"
          inputMode="decimal"
          value={row.secondary}
          onChange={(e) => onChange({ ...row, secondary: e.target.value })}
          placeholder={secondColumnPlaceholder}
          className={textField}
        />
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove loan"
        className="border-border-strong bg-bg-elevated hover:bg-danger/10 hover:border-danger hover:text-danger rounded-md border px-3 py-2 text-sm"
      >
        ✕
      </button>
    </div>
  );
}

export function WeightedLoanCalculator({
  secondColumnLabel,
  secondColumnPlaceholder,
  buttonLabel,
  compute,
  formatResult,
}: WeightedLoanCalculatorProps) {
  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow()]);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    const parsed = rows.map((r) => ({
      principal: r.principal.trim() === "" ? NaN : Number(r.principal),
      secondary: r.secondary.trim() === "" ? NaN : Number(r.secondary),
    }));
    const outcome = compute(parsed);
    if (outcome.ok) {
      setResult(formatResult(outcome.value));
      setError(null);
    } else {
      setResult(null);
      setError(outcome.message);
    }
  }

  function reset() {
    setRows([emptyRow(), emptyRow()]);
    setResult(null);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <RowFields
            key={row.id}
            row={row}
            secondColumnLabel={secondColumnLabel}
            secondColumnPlaceholder={secondColumnPlaceholder}
            onChange={(updated) =>
              setRows((prev) =>
                prev.map((r) => (r.id === updated.id ? updated : r)),
              )
            }
            onRemove={() =>
              setRows((prev) => prev.filter((r) => r.id !== row.id))
            }
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setRows((prev) => [...prev, emptyRow()])}
          className={buttonGhost}
        >
          + Add Loan
        </button>
        <button type="button" onClick={run} className={buttonPrimary}>
          {buttonLabel}
        </button>
        <button type="button" onClick={reset} className={buttonGhost}>
          Reset
        </button>
      </div>
      {error && <StatusMessage tone="error">{error}</StatusMessage>}
      {result && <StatusMessage tone="success">{result}</StatusMessage>}
    </div>
  );
}

export function WeightedRateCalculator() {
  return (
    <WeightedLoanCalculator
      secondColumnLabel="Interest Rate (%)"
      secondColumnPlaceholder="Interest %"
      buttonLabel="Calculate Weighted Rate"
      compute={(rows) =>
        weightedAverageRate(
          rows.map((r) => ({ principal: r.principal, ratePercent: r.secondary })),
        )
      }
      formatResult={(v) => `Weighted Avg Interest Rate: ${(v.weightedRatePercent ?? 0).toFixed(2)}%`}
    />
  );
}

export function WeightedMaturityCalculator() {
  return (
    <WeightedLoanCalculator
      secondColumnLabel="Maturity (Years)"
      secondColumnPlaceholder="Years"
      buttonLabel="Calculate Weighted Maturity"
      compute={(rows) =>
        weightedAverageMaturity(
          rows.map((r) => ({ principal: r.principal, years: r.secondary })),
        )
      }
      formatResult={(v) => `Weighted Avg Maturity: ${(v.weightedYears ?? 0).toFixed(2)} years`}
    />
  );
}

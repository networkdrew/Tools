import { useState } from "react";
import { NumberField } from "./NumberField";
import { StatusMessage } from "@/components/react/StatusMessage";
import { buttonGhost, buttonPrimary } from "@/components/react/styles";
import {
  amortizationSchedule,
  type AmortizationRow,
} from "@/lib/tools-logic/finance-calculator/loans";
import { formatCurrency } from "./format";

export function AmortizationCalculator() {
  const [principal, setPrincipal] = useState("");
  const [rate, setRate] = useState("");
  const [years, setYears] = useState("");
  const [summary, setSummary] = useState<{
    monthlyPayment: number;
    totalPayment: number;
    totalInterest: number;
  } | null>(null);
  const [schedule, setSchedule] = useState<AmortizationRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function run() {
    const toNumber = (v: string) => (v.trim() === "" ? NaN : Number(v));
    const result = amortizationSchedule(
      toNumber(principal),
      toNumber(rate),
      toNumber(years),
    );
    if (result.ok) {
      const { schedule: rows, ...rest } = result.value;
      setSummary(rest);
      setSchedule(rows);
      setError(null);
    } else {
      setSummary(null);
      setSchedule(null);
      setError(result.message);
    }
  }

  function reset() {
    setPrincipal("");
    setRate("");
    setYears("");
    setSummary(null);
    setSchedule(null);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <NumberField
          label="Loan Amount (Principal)"
          value={principal}
          onChange={setPrincipal}
          placeholder="20000"
        />
        <NumberField
          label="Annual Interest Rate (%)"
          value={rate}
          onChange={setRate}
          placeholder="5.0"
          step="0.01"
        />
        <NumberField
          label="Term (Years)"
          value={years}
          onChange={setYears}
          placeholder="5"
        />
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={run} className={buttonPrimary}>
          Generate Schedule
        </button>
        <button type="button" onClick={reset} className={buttonGhost}>
          Reset
        </button>
      </div>

      {error && <StatusMessage tone="error">{error}</StatusMessage>}

      {summary && schedule && (
        <div className="flex flex-col gap-4">
          <dl className="border-border bg-bg-sunken flex flex-col gap-2 rounded-md border p-4">
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-text-muted text-sm">Monthly Payment</dt>
              <dd className="text-text font-mono text-sm font-semibold">
                {formatCurrency(summary.monthlyPayment)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-text-muted text-sm">Total Paid</dt>
              <dd className="text-text font-mono text-sm font-semibold">
                {formatCurrency(summary.totalPayment)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between gap-4">
              <dt className="text-text-muted text-sm">Total Interest</dt>
              <dd className="text-text font-mono text-sm font-semibold">
                {formatCurrency(summary.totalInterest)}
              </dd>
            </div>
          </dl>

          <div className="border-border-strong overflow-x-auto rounded-md border">
            <table className="w-full min-w-[420px] text-sm">
              <thead className="bg-bg-sunken text-text-muted text-left">
                <tr>
                  <th className="px-3 py-2 font-medium">Month</th>
                  <th className="px-3 py-2 font-medium">Payment</th>
                  <th className="px-3 py-2 font-medium">Interest</th>
                  <th className="px-3 py-2 font-medium">Principal</th>
                  <th className="px-3 py-2 font-medium">Remaining</th>
                </tr>
              </thead>
              <tbody>
                {schedule.map((row) => (
                  <tr key={row.month} className="border-border border-t">
                    <td className="px-3 py-2">{row.month}</td>
                    <td className="px-3 py-2">{formatCurrency(row.payment)}</td>
                    <td className="px-3 py-2">{formatCurrency(row.interest)}</td>
                    <td className="px-3 py-2">{formatCurrency(row.principal)}</td>
                    <td className="px-3 py-2">{formatCurrency(row.remaining)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

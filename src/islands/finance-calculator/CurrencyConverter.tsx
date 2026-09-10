import { useId, useState } from "react";
import { StatusMessage } from "@/components/react/StatusMessage";
import {
  buttonGhost,
  buttonPrimary,
  labelText,
  selectField,
  textField,
} from "@/components/react/styles";
import {
  convertCurrency,
  CURRENCIES,
  type Currency,
} from "@/lib/tools-logic/finance-calculator/misc";

export function CurrencyConverter() {
  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState<Currency>("USD");
  const [to, setTo] = useState<Currency>("EUR");
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const amountId = useId();
  const fromId = useId();
  const toId = useId();

  function run() {
    const parsed = amount.trim() === "" ? NaN : Number(amount);
    const outcome = convertCurrency(parsed, from, to);
    if (outcome.ok) {
      setResult(
        `${parsed.toFixed(2)} ${from} = ${outcome.value.converted.toFixed(2)} ${to}`,
      );
      setError(null);
    } else {
      setResult(null);
      setError(outcome.message);
    }
  }

  function reset() {
    setAmount("");
    setFrom("USD");
    setTo("EUR");
    setResult(null);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-text-muted text-sm italic">
        Rates are approximate, fixed reference values — not live market data.
      </p>
      <div className="flex flex-col gap-1.5">
        <label htmlFor={amountId} className={labelText}>
          Amount
        </label>
        <input
          id={amountId}
          type="number"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter amount"
          className={textField}
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={fromId} className={labelText}>
            From Currency
          </label>
          <select
            id={fromId}
            value={from}
            onChange={(e) => setFrom(e.target.value as Currency)}
            className={selectField}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor={toId} className={labelText}>
            To Currency
          </label>
          <select
            id={toId}
            value={to}
            onChange={(e) => setTo(e.target.value as Currency)}
            className={selectField}
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={run} className={buttonPrimary}>
          Convert
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

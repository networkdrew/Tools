/** Shared result shape for every finance-calculator function. */
export interface FinanceSuccess<T> {
  ok: true;
  value: T;
}

export interface FinanceFailure {
  ok: false;
  message: string;
}

export type FinanceResult<T> = FinanceSuccess<T> | FinanceFailure;

function isFinitePositive(n: number): boolean {
  return Number.isFinite(n) && n > 0;
}

function isFiniteNonNegative(n: number): boolean {
  return Number.isFinite(n) && n >= 0;
}

/** Validates every input is a finite number (no NaN/Infinity from bad
 *  parsing, e.g. an empty or non-numeric field). Keys should be human-
 *  readable field names ("interest rate", not "annualRatePercent") since
 *  they're shown to the user verbatim. */
export function requireFinite(
  values: Record<string, number>,
): FinanceFailure | null {
  for (const [name, value] of Object.entries(values)) {
    if (!Number.isFinite(value)) {
      const label = name.charAt(0).toUpperCase() + name.slice(1);
      return { ok: false, message: `${label} must be a valid number.` };
    }
  }
  return null;
}

export { isFinitePositive, isFiniteNonNegative };

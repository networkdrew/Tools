/** Presentation-layer number formatting shared by every finance calculator. */

export function formatCurrency(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPercent(decimals = 2) {
  return (n: number) => `${n.toFixed(decimals)}%`;
}

export function formatNumber(decimals = 2) {
  return (n: number) => n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatSuffixed(decimals: number, suffix: string) {
  return (n: number) => `${n.toFixed(decimals)} ${suffix}`;
}

export function formatRatioOrUndefined(decimals = 2) {
  return (n: number | null) =>
    n === null ? "Not defined (EBITDA is 0)" : n.toFixed(decimals);
}

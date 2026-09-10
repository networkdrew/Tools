import { requireFinite, type FinanceResult } from "./types";

function requirePositiveIntegerYears(years: number): string | null {
  if (!Number.isInteger(years) || years <= 0) {
    return "Years to maturity must be a whole number greater than 0.";
  }
  return null;
}

/** Present value of a bond's coupon payments plus its face value at maturity. */
export function bondPrice(
  faceValue: number,
  annualCouponRatePercent: number,
  marketYieldPercent: number,
  years: number,
): FinanceResult<{ price: number }> {
  const invalid = requireFinite({
    "face value": faceValue,
    "coupon rate": annualCouponRatePercent,
    "market yield": marketYieldPercent,
    years,
  });
  if (invalid) return invalid;
  if (faceValue <= 0) {
    return { ok: false, message: "Face value must be greater than 0." };
  }
  if (annualCouponRatePercent < 0) {
    return { ok: false, message: "Coupon rate can't be negative." };
  }
  if (marketYieldPercent <= -100) {
    return { ok: false, message: "Market yield must be greater than -100%." };
  }
  const yearsError = requirePositiveIntegerYears(years);
  if (yearsError) return { ok: false, message: yearsError };

  const coupon = faceValue * (annualCouponRatePercent / 100);
  const yieldRate = marketYieldPercent / 100;
  let price = 0;
  for (let t = 1; t <= years; t++) {
    price += coupon / Math.pow(1 + yieldRate, t);
  }
  price += faceValue / Math.pow(1 + yieldRate, years);
  return { ok: true, value: { price } };
}

/** Approximate yield to maturity via bisection, given a bond's current price. */
export function bondYieldToMaturity(
  currentPrice: number,
  faceValue: number,
  annualCouponRatePercent: number,
  years: number,
): FinanceResult<{ ytmPercent: number }> {
  const invalid = requireFinite({
    "current price": currentPrice,
    "face value": faceValue,
    "coupon rate": annualCouponRatePercent,
    years,
  });
  if (invalid) return invalid;
  if (currentPrice <= 0) {
    return { ok: false, message: "Current bond price must be greater than 0." };
  }
  if (faceValue <= 0) {
    return { ok: false, message: "Face value must be greater than 0." };
  }
  if (annualCouponRatePercent < 0) {
    return { ok: false, message: "Coupon rate can't be negative." };
  }
  const yearsError = requirePositiveIntegerYears(years);
  if (yearsError) return { ok: false, message: yearsError };

  const coupon = faceValue * (annualCouponRatePercent / 100);
  const priceAtYield = (yld: number) => {
    let pv = 0;
    for (let t = 1; t <= years; t++) pv += coupon / Math.pow(1 + yld, t);
    return pv + faceValue / Math.pow(1 + yld, years);
  };

  let lower = 0.0;
  let upper = 1.0;
  let guess = 0;
  const tolerance = 1e-7;
  for (let i = 0; i < 100; i++) {
    guess = (lower + upper) / 2;
    const trialPrice = priceAtYield(guess);
    if (Math.abs(trialPrice - currentPrice) < tolerance) break;
    if (trialPrice > currentPrice) {
      lower = guess;
    } else {
      upper = guess;
    }
  }
  return { ok: true, value: { ytmPercent: guess * 100 } };
}

/** Annualized discount yield for a Treasury bill bought below face value. */
export function treasuryBillYield(
  faceValue: number,
  purchasePrice: number,
  daysToMaturity: number,
): FinanceResult<{ discountYieldPercent: number }> {
  const invalid = requireFinite({
    "face value": faceValue,
    "purchase price": purchasePrice,
    "days to maturity": daysToMaturity,
  });
  if (invalid) return invalid;
  if (faceValue <= 0 || purchasePrice <= 0 || daysToMaturity <= 0) {
    return {
      ok: false,
      message: "Face value, purchase price, and days to maturity must all be greater than 0.",
    };
  }
  const discountYieldPercent =
    ((faceValue - purchasePrice) / faceValue) * (360 / daysToMaturity) * 100;
  return { ok: true, value: { discountYieldPercent } };
}

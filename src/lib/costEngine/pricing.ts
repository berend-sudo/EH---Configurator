import {
  MARGIN,
  PRICE_DISPLAY_ROUND_UGX,
  USD_TO_UGX,
  VAT,
} from "./constants";

/** 10% margin on cost ex VAT (Excel B42). */
export function marginUsd(costUsd: number): number {
  return costUsd * MARGIN;
}

/** 18% VAT on sales price ex VAT (Excel B45 - B44). */
export function vatUsd(salesPriceUsdExVat: number): number {
  return salesPriceUsdExVat * VAT;
}

/** USD → UGX at fixed 3700 rate (Excel B38). */
export function usdToUgx(usd: number): number {
  return usd * USD_TO_UGX;
}

/**
 * Round UP to the nearest 100,000 UGX for client-facing display.
 * Spec says all client-shown prices are rounded up to the next 100k.
 */
export function roundUpUgx(value: number): number {
  return Math.ceil(value / PRICE_DISPLAY_ROUND_UGX) * PRICE_DISPLAY_ROUND_UGX;
}

import type {
  CostBreakdown,
  CostInput,
  ComponentLineItem,
} from "@/types/costEngine";
import { COMPONENT_COSTS } from "./components";
import { marginUsd, roundUpUgx, usdToUgx, vatUsd } from "./pricing";

/**
 * Compute the full cost breakdown for a configured home.
 *
 * Mirrors the calculation chain from Excel
 * "Project Costs" cells B41 → B45 (USD) and B48 → B51 (UGX):
 *
 *   costUsd       = Σ (amount × usdUnit + fixedExtra)         // B41 = D63
 *   marginUsd     = costUsd × 10%                             // B42
 *   salesUsd      = costUsd + marginUsd                       // B44
 *   vatUsd        = salesUsd × 18%                            // B45 - B44
 *   priceUsdInc   = salesUsd × 1.18                           // B45
 *
 *   costUgxRounded      = round(costUsd × 3700)               // B48 — labelled
 *                                                             //  "Price in UGX ex VAT"
 *                                                             //  in the sheet but is
 *                                                             //  literally cost × rate.
 *   marginUgx           = costUgxRounded × 10%                // B49
 *   vatUgx              = (costUgxRounded + marginUgx) × 18%  // B50
 *   priceUgxIncVat      = costUgxRounded + marginUgx + vatUgx // B51
 *   priceUgxIncVatRounded = ceil(priceUgxIncVat / 100,000)    // client display
 *                          × 100,000
 */
export function calculatePrice(input: CostInput): CostBreakdown {
  const breakdown: ComponentLineItem[] = [];
  let costUsdExVat = 0;

  for (const component of COMPONENT_COSTS) {
    const amount = input.componentAmounts[component.id] ?? 0;
    if (amount === 0 && !component.fixedExtraUsd) continue;

    const fixedExtra = component.fixedExtraUsd ?? 0;
    const totalUsd = amount * component.usdUnit + fixedExtra;
    costUsdExVat += totalUsd;

    breakdown.push({
      id: component.id,
      name: component.name,
      amount,
      unitCostUsd: component.usdUnit,
      fixedExtraUsd: fixedExtra,
      totalUsd,
    });
  }

  const margin = marginUsd(costUsdExVat);
  const salesPriceUsdExVat = costUsdExVat + margin;
  const vat = vatUsd(salesPriceUsdExVat);
  const priceUsdIncVat = salesPriceUsdExVat + vat;

  const costUgxRounded = Math.round(usdToUgx(costUsdExVat));
  const marginUgx = costUgxRounded * 0.10;
  const vatUgx = (costUgxRounded + marginUgx) * 0.18;
  const priceUgxIncVat = costUgxRounded + marginUgx + vatUgx;
  const priceUgxIncVatRounded = roundUpUgx(priceUgxIncVat);

  const pricePerSqmUgxIncVat =
    input.gfaSqm > 0 ? priceUgxIncVat / input.gfaSqm : 0;

  return {
    gfaSqm: input.gfaSqm,
    costUsdExVat,
    marginUsd: margin,
    salesPriceUsdExVat,
    vatUsd: vat,
    priceUsdIncVat,
    costUgxRounded,
    marginUgx,
    vatUgx,
    priceUgxIncVat,
    priceUgxIncVatRounded,
    pricePerSqmUgxIncVat,
    componentBreakdown: breakdown,
  };
}

export { COMPONENT_COSTS, getComponentCost } from "./components";
export {
  MARGIN,
  VAT,
  USD_TO_UGX,
  PRICE_DISPLAY_ROUND_UGX,
  FRAME_A_MM,
  FRAME_B_MM,
  FRAME_C_MM,
  JUMP_MM,
  MIN_JUMPS,
  MAX_JUMPS,
} from "./constants";
export { marginUsd, vatUsd, usdToUgx, roundUpUgx } from "./pricing";
export {
  deriveAmounts,
  type PlanAmountsInput,
  type DerivedAmounts,
} from "@/lib/floorPlan/deriveAmounts";
export {
  deriveMonoPitchAmounts,
  type MonoPitchInputs,
  type DerivedMonoPitchModel,
} from "@/lib/floorPlan/deriveMonoPitchAmounts";

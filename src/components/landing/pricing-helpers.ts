import { priceForLanding, type LandingRoof } from "@/lib/budget";

export type RoofType = LandingRoof;

export const minBedroomsFor = (roof: RoofType): number => (roof === "monopitch" ? 0 : 1);

export const maxBedroomsFor = (budget: number, roof: RoofType): number => {
  const floor = minBedroomsFor(roof);
  for (let b = 4; b >= floor; b--) {
    if (priceForLanding({ roof, bedrooms: b }) <= budget) return b;
  }
  return floor;
};

export const minCostFor = (roof: RoofType): number =>
  priceForLanding({ roof, bedrooms: minBedroomsFor(roof) });

export const isAffordable = (roof: RoofType, budget: number): boolean =>
  minCostFor(roof) <= budget;

// Search order = ascending minCost so the fallback picks the cheapest
// roof still in reach at the current budget.
export const ROOF_FALLBACK_ORDER: readonly RoofType[] = ["monopitch", "gable", "clerestory"];

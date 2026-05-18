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

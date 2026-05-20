import type { LandingRoof } from "@/lib/budget";

export type RoofType = LandingRoof;
export type BudgetTable = Record<number, number>;

export const minBedroomsFor = (roof: RoofType): number => (roof === "monopitch" ? 0 : 1);

// Until gable / clerestory DXFs exist, every roof shares the same table
// (computed from the Monopitch files). Roof is accepted for forward compat
// so callers don't have to change when per-roof tables ship.
export const priceFor = (
  table: BudgetTable | null,
  _roof: RoofType,
  bedrooms: number,
): number | null => (table ? table[bedrooms] ?? null : null);

export const maxBedroomsFor = (
  table: BudgetTable | null,
  budget: number,
  roof: RoofType,
): number => {
  const floor = minBedroomsFor(roof);
  if (!table) return 4; // pre-fetch: don't gate
  for (let b = 4; b >= floor; b--) {
    const p = priceFor(table, roof, b);
    if (p != null && p <= budget) return b;
  }
  return floor;
};

export const minCostFor = (table: BudgetTable | null, roof: RoofType): number => {
  const p = priceFor(table, roof, minBedroomsFor(roof));
  return p ?? 0;
};

export const isAffordable = (
  table: BudgetTable | null,
  roof: RoofType,
  budget: number,
): boolean => {
  if (!table) return true; // pre-fetch: don't gate
  return minCostFor(table, roof) <= budget;
};

// Search order = ascending minCost so the fallback picks the cheapest
// roof still in reach at the current budget.
export const ROOF_FALLBACK_ORDER: readonly RoofType[] = ["monopitch", "gable", "clerestory"];

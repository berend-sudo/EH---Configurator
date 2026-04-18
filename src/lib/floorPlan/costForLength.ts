import type { ComponentAmounts, ComponentId } from "@/types/costEngine";
import type { FloorPlanModel } from "@/types/floorPlan";

/**
 * Scale the base component amounts for a plan to a new structural length,
 * keeping length-independent components flat. This is a coarse Phase 2b
 * approximation — discrete frame combinatorics (A/B/C column counts) will
 * come in Phase 3 when the admin tool is wired up.
 *
 * Components grouped by how they scale with structural length L:
 *   LENGTH_PROPORTIONAL  — scale with L / baseLengthMm
 *   FIXED                — unchanged by L (overhead, fittings, etc.)
 */
const LENGTH_PROPORTIONAL: ReadonlySet<ComponentId> = new Set([
  "floor-frame-2442x1221",
  "floor-frame-2442x2442",
  "floor-frame-2442x3053",
  "floor-frame-2442x3663",
  "decking-frame-2442x1221",
  "decking-frame-2442x2442",
  "decking-frame-2442x3053",
  "wall-frame-2442x2654",
  "wall-frame-3053x2654",
  "wall-frame-2442x2999",
  "wall-frame-3053x2999",
  "partition-wall-frame-per-m1",
  "facade-cladding-per-m2",
  "roof-frame-mono-pitch",
  "roof-frame-mono-pitch-edge",
  "roof-frame-compact-gable",
  "roof-frame-compact-gable-edge",
  "roof-frame-standard-gable",
  "roof-frame-standard-gable-edge",
  "roof-frame-large-gable",
  "roof-frame-large-gable-edge",
  "roof-sheets-per-sqm",
  "paintworks-per-sqm",
  "foundation-point",
  "pergola-per-sqm",
]);

export function scaleAmountsToLength(
  base: ComponentAmounts,
  baseLengthMm: number,
  targetLengthMm: number,
): ComponentAmounts {
  if (targetLengthMm === baseLengthMm) return { ...base };
  const ratio = targetLengthMm / baseLengthMm;
  const out: ComponentAmounts = { ...base };
  for (const [id, amount] of Object.entries(base) as [ComponentId, number][]) {
    if (!LENGTH_PROPORTIONAL.has(id)) continue;
    out[id] = (amount ?? 0) * ratio;
  }
  return out;
}

/** Derive a rough GFA for a plan at `lengthMm` (depth × length, m²). */
export function gfaForPlanAtLength(
  plan: FloorPlanModel,
  lengthMm: number,
): number {
  return (plan.depthMm * lengthMm) / 1_000_000;
}

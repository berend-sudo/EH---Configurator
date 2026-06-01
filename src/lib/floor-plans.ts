import { selectionLabel, type Selection } from "@/lib/typologies";

export interface FloorPlanEntry {
  selection: Selection;
  bedrooms: number;
  version: number;
  name: string;
  /** On-disk filename in public/floorplans/, conforming to the DXF scheme. */
  file: string;
}

// NOTE: the registry is no longer hardcoded — it is scanned from
// public/floorplans/ (see lib/floor-plan-scan.ts, exposed at
// /api/floor-plans) so that uploading a correctly-named DXF is all it takes
// to make a plan available. pickPlan() below operates on that scanned list.

/**
 * Pick the best plan for a selection + bedroom count from the available set.
 * Ranking (lower is better):
 *   tier 0 — same typology AND subtype   (exact variant)
 *   tier 1 — same typology, other subtype (closest sibling)
 *   tier 2 — any other typology           (last-resort, e.g. Monopitch)
 * within a tier, the nearest bedroom count wins.
 *
 * TODO(subtype-plans): tiers 1–2 are fallbacks for selections that don't yet
 * have their own DXF. They disappear naturally as the missing plans land.
 */
export function pickPlan(
  plans: FloorPlanEntry[],
  sel: Selection,
  bedrooms: number | null | undefined,
): FloorPlanEntry | null {
  if (plans.length === 0) return null;
  const br = bedrooms == null || Number.isNaN(bedrooms) ? null : bedrooms;

  const score = (p: FloorPlanEntry): number => {
    const sameTyp = p.selection.typology === sel.typology;
    const sameSub = p.selection.subtype === sel.subtype;
    const tier = sameTyp && sameSub ? 0 : sameTyp ? 1 : 2;
    const bedDiff = br == null ? 0 : Math.abs(p.bedrooms - br);
    return tier * 1000 + bedDiff;
  };

  return [...plans].sort((a, b) => {
    const d = score(a) - score(b);
    if (d !== 0) return d;
    // stable-ish tie-break: prefer the higher version (newest drawing)
    return b.version - a.version;
  })[0];
}

/** Build a display name from a scanned entry's selection + bedroom count. */
export function planName(sel: Selection, bedrooms: number): string {
  const label = selectionLabel(sel);
  const bed = bedrooms === 0 ? "Studio" : `${bedrooms}-Bedroom`;
  return `${label} ${bed}`;
}

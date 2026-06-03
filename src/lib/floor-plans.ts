import {
  TYPOLOGIES,
  TYPOLOGY_ORDER,
  selectionLabel,
  type Selection,
  type TypologyId,
} from "@/lib/typologies";

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

// ----------------------------------------------------------------------------
// Availability — derived from the scanned plans set. A typology / subtype /
// bedroom count is "available" if at least one matching DXF is on disk.
//
// Architecturally, this is how we hide options without deleting their
// TYPOLOGIES data: the spec stays, but the picker / counters only surface
// what has a plan. Re-enabling Gable Small or Clerestory Standard is then
// literally "drop a correctly-named DXF in public/floorplans/".
// ----------------------------------------------------------------------------

/** Typologies with at least one available plan, in TYPOLOGY_ORDER. */
export function availableTypologies(plans: FloorPlanEntry[]): TypologyId[] {
  const set = new Set<TypologyId>(plans.map((p) => p.selection.typology));
  return TYPOLOGY_ORDER.filter((id) => set.has(id));
}

/** Subtype ids that have at least one plan for the given typology, in spec order. */
export function availableSubtypes(
  plans: FloorPlanEntry[],
  typology: TypologyId,
): string[] {
  const typ = TYPOLOGIES[typology];
  if (!typ.subtypes) return [];
  const set = new Set<string>();
  for (const p of plans) {
    if (p.selection.typology === typology && p.selection.subtype) {
      set.add(p.selection.subtype);
    }
  }
  return Object.keys(typ.subtypes).filter((id) => set.has(id));
}

/** Bedroom counts that have a plan for the exact selection, sorted ascending. */
export function availableBedrooms(
  plans: FloorPlanEntry[],
  sel: Selection,
): number[] {
  const set = new Set<number>();
  for (const p of plans) {
    if (
      p.selection.typology === sel.typology &&
      p.selection.subtype === sel.subtype
    ) {
      set.add(p.bedrooms);
    }
  }
  return Array.from(set).sort((a, b) => a - b);
}

/**
 * Clamp a selection to one that has plans available:
 *  - if the current typology has none, swap to the first available typology;
 *  - if the typology has plans but the subtype doesn't, swap to its first
 *    available subtype.
 * Returns the original selection unchanged when already available, or null
 * if the plans set is empty (caller decides what to show).
 */
export function resolveAvailableSelection(
  plans: FloorPlanEntry[],
  sel: Selection,
): Selection | null {
  if (plans.length === 0) return null;
  const typs = availableTypologies(plans);
  if (typs.length === 0) return null;

  const typology = typs.includes(sel.typology) ? sel.typology : typs[0];
  const typ = TYPOLOGIES[typology];

  if (!typ.subtypes) return { typology, subtype: null };

  const subs = availableSubtypes(plans, typology);
  if (subs.length === 0) {
    // Subtyped typology with no available subtypes — bounce to next typology.
    const next = typs.find((id) => {
      const t = TYPOLOGIES[id];
      return !t.subtypes || availableSubtypes(plans, id).length > 0;
    });
    return next ? resolveAvailableSelection(plans, { typology: next, subtype: null }) : null;
  }

  const subtype = sel.subtype && subs.includes(sel.subtype) ? sel.subtype : subs[0];
  return { typology, subtype };
}

/** Clamp bedrooms to the nearest available value for a selection. */
export function resolveAvailableBedrooms(
  plans: FloorPlanEntry[],
  sel: Selection,
  bedrooms: number,
): number {
  const avail = availableBedrooms(plans, sel);
  if (avail.length === 0) return bedrooms; // caller handles "no plan"
  if (avail.includes(bedrooms)) return bedrooms;
  // nearest; ties go to the lower count for predictability
  return avail.reduce((best, b) => {
    const dBest = Math.abs(best - bedrooms);
    const dB = Math.abs(b - bedrooms);
    if (dB < dBest) return b;
    if (dB === dBest && b < best) return b;
    return best;
  }, avail[0]);
}

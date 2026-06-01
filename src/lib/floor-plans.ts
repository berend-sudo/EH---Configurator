import { dxfFilename, type Selection } from "@/lib/typologies";

export interface FloorPlanEntry {
  selection: Selection;
  bedrooms: number;
  version: number;
  name: string;
  /** On-disk filename in public/floorplans/ — always derived via dxfFilename(). */
  file: string;
}

// The DXFs physically present in public/floorplans/. All are Monopitch today.
// `file` is derived through dxfFilename() so the naming scheme has one owner.
const ENTRIES: Omit<FloorPlanEntry, "file">[] = [
  { selection: { typology: "monopitch", subtype: null }, bedrooms: 0, version: 6, name: "Monopitch Studio" },
  { selection: { typology: "monopitch", subtype: null }, bedrooms: 1, version: 1, name: "Monopitch 1-Bedroom" },
  { selection: { typology: "monopitch", subtype: null }, bedrooms: 2, version: 3, name: "Monopitch 2-Bedroom" },
  { selection: { typology: "monopitch", subtype: null }, bedrooms: 3, version: 1, name: "Monopitch 3-Bedroom" },
  { selection: { typology: "aframe",    subtype: "large" }, bedrooms: 1, version: 1, name: "A-frame Large 1-Bedroom" },
];

export const FLOOR_PLANS: FloorPlanEntry[] = ENTRIES.map((e) => ({
  ...e,
  file: dxfFilename(e.selection, e.bedrooms, e.version),
}));

/**
 * Pick the plan to render for a selection + bedroom count.
 * Exact subtype match wins; otherwise falls back to the closest existing
 * plan (today: Monopitch) so every selection still renders something.
 */
export function pickPlan(
  sel: Selection,
  bedrooms: number | null | undefined,
): FloorPlanEntry {
  const br = bedrooms == null || Number.isNaN(bedrooms) ? 0 : bedrooms;

  const exact = FLOOR_PLANS.find(
    (p) =>
      p.selection.typology === sel.typology &&
      p.selection.subtype === sel.subtype &&
      p.bedrooms === br,
  );
  if (exact) return exact;

  // TODO(subtype-plans): no subtype-specific DXF exists yet. Reuse the closest
  // existing plan (currently all Monopitch) with the same bedroom count.
  const sameBedrooms = FLOOR_PLANS.find((p) => p.bedrooms === br);
  if (sameBedrooms) return sameBedrooms;

  // TODO(subtype-plans): fall back to the nearest available bedroom count.
  return [...FLOOR_PLANS].sort(
    (a, b) => Math.abs(a.bedrooms - br) - Math.abs(b.bedrooms - br),
  )[0];
}

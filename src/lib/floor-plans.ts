export const FLOOR_PLANS = [
  { id: "monopitch-studio-v6", name: "Monopitch Studio",   file: "Monopitch - Studio v6.dxf", bedrooms: 0 },
  { id: "monopitch-1br",       name: "Monopitch 1-Bedroom", file: "Monopitch - 1BR.dxf",       bedrooms: 1 },
  { id: "monopitch-2br-v3",    name: "Monopitch 2-Bedroom", file: "Monopitch - 2BR v3.dxf",    bedrooms: 2 },
  { id: "monopitch-3br",       name: "Monopitch 3-Bedroom", file: "Monopitch - 3BR.dxf",       bedrooms: 3 },
] as const;

export type FloorPlanEntry = (typeof FLOOR_PLANS)[number];

export function pickPlanByBedrooms(bedrooms: number | null | undefined): FloorPlanEntry {
  if (bedrooms == null || Number.isNaN(bedrooms)) return FLOOR_PLANS[0];
  const match = FLOOR_PLANS.find((p) => p.bedrooms === bedrooms);
  return match ?? FLOOR_PLANS[0];
}

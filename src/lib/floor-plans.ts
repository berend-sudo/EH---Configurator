export const FLOOR_PLANS = [
  { id: "monopitch-studio-v5", name: "Monopitch Studio", file: "Monopitch - Studio v5.dxf" },
] as const;

export type FloorPlanEntry = (typeof FLOOR_PLANS)[number];

import type { FloorplanJSON, Vertex } from "@/types/floorplan";

// Rates from the "Price Calc" sheet (Typology Calculator, rows 87-92).
// Gables price ~9% cheaper per m² than Mono Pitch / Clerestory.
// A Frame has no published rate in the Excel — falls back to Mono Pitch.
const RATE_MONO_PITCH  = 1_228_500;
const RATE_GABLE       = 1_123_500;
const RATE_CLERESTORY  = 1_228_500;
const RATE_A_FRAME     = 1_228_500; // placeholder, no Excel rate

const ELEC_BASE        = 1_500_000;
const ELEC_PER_SQM     =    50_000;
const PLUMB_BASE       =   500_000;
const PLUMB_PER_BATH   = 1_000_000;
const PLUMB_PER_SQM    =    20_000;
const TILE_PER_BATH    =   960_000; // 80,000 × 12
const SANITARY_PER_BATH = 2_300_000;
const KITCHEN_BASE     = 2_000_000;
const KITCHEN_PER_UNIT =   500_000;
export const USD_RATE  =     3_700;

// NOTE: this is NOT identical to the polygonAreaM2 in FloorplanSVG.tsx.
// The renderer version takes a WindowPositions arg and follows vertices
// that are `attach`ed to capped windows. This one applies `delta` linearly
// to every moveX vertex, so at slider values large enough to cap windows
// the budget here may slightly over-state living area vs. the rendered
// plan. Phase C of the architecture cleanup will unify them via a shared
// window-cap-aware geometry resolver (src/lib/floorplan/geometry.ts).
export function polygonAreaM2(verts: Vertex[], delta: number): number {
  let a = 0;
  for (let i = 0; i < verts.length; i++) {
    const j = (i + 1) % verts.length;
    const xi = verts[i].x + (verts[i].moveX ? delta : 0);
    const xj = verts[j].x + (verts[j].moveX ? delta : 0);
    a += xi * verts[j].y - xj * verts[i].y;
  }
  return Math.abs(a) / 2 / 1_000_000;
}

export type TypologyName =
  | "Mono Pitch"
  | "Compact Gable"
  | "Standard Gable"
  | "Large Gable"
  | "Standard Clerestory"
  | "Large Clerestory"
  | "A Frame";

export interface TypologyInfo {
  name: TypologyName;
  sqmRate: number;
  detected: boolean; // false when we fell back to the default
}

export function detectTypology(planName: string): TypologyInfo {
  const n = planName.toLowerCase();

  if (n.includes("clerestory")) {
    const isLarge = n.includes("large");
    return {
      name: isLarge ? "Large Clerestory" : "Standard Clerestory",
      sqmRate: RATE_CLERESTORY,
      detected: true,
    };
  }

  if (n.includes("a frame") || n.includes("a-frame") || n.includes("aframe")) {
    return { name: "A Frame", sqmRate: RATE_A_FRAME, detected: true };
  }

  if (n.includes("gable")) {
    if (n.includes("compact") || n.includes("small")) {
      return { name: "Compact Gable", sqmRate: RATE_GABLE, detected: true };
    }
    if (n.includes("large")) {
      return { name: "Large Gable", sqmRate: RATE_GABLE, detected: true };
    }
    return { name: "Standard Gable", sqmRate: RATE_GABLE, detected: true };
  }

  if (n.includes("monopitch") || n.includes("mono pitch") || n.includes("mono-pitch")) {
    return { name: "Mono Pitch", sqmRate: RATE_MONO_PITCH, detected: true };
  }

  // Fallback: assume Mono Pitch but flag as undetected so the UI can warn.
  return { name: "Mono Pitch", sqmRate: RATE_MONO_PITCH, detected: false };
}

export interface CountRoomsResult {
  gfa: number;
  terraceArea: number;
  bedrooms: number;
  bathrooms: number;
  kitchens: number;
}

export function countRooms(plan: FloorplanJSON, delta: number): CountRoomsResult {
  let gfa = 0, terraceArea = 0, bedrooms = 0, bathrooms = 0, kitchens = 0;
  for (const layer of plan.layers) {
    if (!layer.name.startsWith("Rooms")) continue;
    const isTerrace = layer.name.includes("Terrace");
    for (const entity of layer.entities) {
      if (entity.type !== "polyline" || !entity.closed) continue;
      const area = polygonAreaM2(entity.vertices, delta);
      if (isTerrace) terraceArea += area;
      else gfa += area;
      if (layer.name.includes("Bath"))    bathrooms++;
      if (layer.name.includes("Kitchen")) kitchens++;
      if (layer.name.includes("Bedroom")) bedrooms++;
    }
  }
  return { gfa, terraceArea, bedrooms, bathrooms, kitchens };
}

export interface BudgetLineItem { label: string; amount: number; }

export interface BudgetResult {
  typology: TypologyInfo;
  lines: { core: BudgetLineItem[]; optional: BudgetLineItem[]; };
  coreTotal: number;
  grandTotal: number;
}

export function calculateBudget(rooms: CountRoomsResult, typology: TypologyInfo): BudgetResult {
  const { gfa, bathrooms, kitchens } = rooms;
  const sqmRate        = typology.sqmRate;
  const basicStructure = gfa * sqmRate;
  const electricals    = ELEC_BASE   + ELEC_PER_SQM  * gfa;
  const plumbing       = PLUMB_BASE  + PLUMB_PER_BATH * bathrooms + PLUMB_PER_SQM * gfa;
  const coreTotal      = basicStructure + electricals + plumbing;

  const tiling         = TILE_PER_BATH     * bathrooms;
  const sanitaryWares  = SANITARY_PER_BATH * bathrooms;
  const kitchenBlock   = kitchens > 0 ? KITCHEN_BASE + KITCHEN_PER_UNIT * kitchens : 0;

  const optional: BudgetLineItem[] = [
    { label: "Tiling (bathrooms)", amount: tiling },
    { label: "Sanitary wares",     amount: sanitaryWares },
    ...(kitchens > 0 ? [{ label: "Kitchen block", amount: kitchenBlock }] : []),
  ];

  return {
    typology,
    lines: {
      core: [
        { label: "Basic structure", amount: basicStructure },
        { label: "Electricals",     amount: electricals    },
        { label: "Plumbing",        amount: plumbing       },
      ],
      optional,
    },
    coreTotal,
    grandTotal: coreTotal + tiling + sanitaryWares + kitchenBlock,
  };
}

// Roof identifier shared between Landing and Configurator URLs.
// Per-roof pricing tables ship once we have non-Monopitch DXFs; until then
// see `computeBudgetTable` in `lib/budget-table.ts`.
export type LandingRoof = "monopitch" | "gable" | "clerestory";

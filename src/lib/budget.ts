import type { FloorplanJSON } from "@/types/floorplan";
import {
  buildWindowPositions,
  polygonAreaM2,
} from "@/lib/floorplan/geometry";

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

// Area math is delegated to @/lib/floorplan/geometry's window-cap-aware
// polygonAreaM2. Phase A noted the divergence; phase C3 unifies it so the
// quoted budget matches the rendered plan even at maxDelta where windows
// hit the 1.8 m cap.

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
  // Resolve the window positions once so polygonAreaM2 follows vertices that
  // are `attach`ed to capped windows. Doing this upfront is O(windows) and
  // matches what FloorplanSVG does for every render.
  const wp = buildWindowPositions(plan, delta);
  let gfa = 0, terraceArea = 0, bedrooms = 0, bathrooms = 0, kitchens = 0;
  for (const layer of plan.layers) {
    if (!layer.name.startsWith("Rooms")) continue;
    const isTerrace = layer.name.includes("Terrace");
    for (const entity of layer.entities) {
      if (entity.type !== "polyline" || !entity.closed) continue;
      const area = polygonAreaM2(entity.vertices, delta, wp);
      if (isTerrace) terraceArea += area;
      else gfa += area;
      // Layer names follow the README convention (`Rooms$Bed Room`,
      // `Rooms$Bath Room`, `Rooms$Living Room`, `Rooms$Terrace`). Match
      // them with their actual spaces.
      if (layer.name.includes("Bath Room"))    bathrooms++;
      if (layer.name.includes("Kitchen"))      kitchens++;
      if (layer.name.includes("Bed Room"))     bedrooms++;
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

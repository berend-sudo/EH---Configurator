import type { FloorplanJSON, Vertex } from "@/types/floorplan";
import { selectionLabel, type Selection, type TypologyId } from "@/lib/typologies";

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

// Mirrors FloorplanSVG.tsx — duplicated to avoid importing from a component file.
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

export interface TypologyInfo {
  name: string;
  sqmRate: number;
  detected: boolean; // reserved: always true now that typology comes from the Selection
}

// Per-typology m² rate, keyed by the new typology ids. The geometry-based
// indicative budget reads its rate from the user's Selection (the plan
// filenames no longer encode the typology).
export const RATE_BY_TYPOLOGY: Record<TypologyId, number> = {
  monopitch: RATE_MONO_PITCH,
  gable: RATE_GABLE,
  aframe: RATE_A_FRAME,
  clerestory: RATE_CLERESTORY,
};

export function typologyInfoFor(sel: Selection): TypologyInfo {
  return {
    name: selectionLabel(sel),
    sqmRate: RATE_BY_TYPOLOGY[sel.typology],
    detected: true,
  };
}

export interface CountRoomsResult {
  gfa: number;
  terraceArea: number;
  bedrooms: number;
  bathrooms: number;
  kitchens: number;
  /** Sum of all Rooms$Mezzanine footprint areas (m²). The mezzanine is NOT
   *  folded into gfa — it's the upper-floor extent, not ground-floor area. */
  mezzanineAreaM2: number;
}

export function countRooms(plan: FloorplanJSON, delta: number): CountRoomsResult {
  let gfa = 0, terraceArea = 0, bedrooms = 0, bathrooms = 0, kitchens = 0;
  let mezzanineAreaM2 = 0;
  for (const layer of plan.layers) {
    if (!layer.name.startsWith("Rooms")) continue;
    const isTerrace = layer.name.includes("Terrace");
    const isMezzanine = layer.name.includes("Mezzanine");
    for (const entity of layer.entities) {
      if (entity.type !== "polyline" || !entity.closed) continue;
      const area = polygonAreaM2(entity.vertices, delta);
      if (isMezzanine) {
        mezzanineAreaM2 += area;
        continue; // mezzanine is upper-floor; don't fold into gfa
      }
      if (isTerrace) terraceArea += area;
      else gfa += area;
      if (layer.name.includes("Bath"))    bathrooms++;
      if (layer.name.includes("Kitchen")) kitchens++;
      if (layer.name.includes("Bedroom")) bedrooms++;
    }
  }
  return { gfa, terraceArea, bedrooms, bathrooms, kitchens, mezzanineAreaM2 };
}

// Mezzanine pricing hook — the single place a mezzanine surcharge could be
// applied. Defaults to 0 (no-op) until the team gives a number; never invent
// one. If a mezzanine is "already in the base plan price", leave at 0.
// TODO(pricing): replace with the confirmed mezzanine surcharge.
export const MEZZANINE_COST = 0;
export function mezzanineSurcharge(plan: FloorplanJSON): number {
  return plan.mezzanine ? MEZZANINE_COST : 0;
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

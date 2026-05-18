import type { FloorplanJSON, Vertex } from "@/types/floorplan";

const RATE_STANDARD    = 1_350_000;
const RATE_CLERESTORY  = 1_420_000;
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

export function detectIsClere(planName: string): boolean {
  return planName.toLowerCase().includes("clerestory");
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
  sqmRate: number;
  lines: { core: BudgetLineItem[]; optional: BudgetLineItem[]; };
  coreTotal: number;
  grandTotal: number;
}

export function calculateBudget(rooms: CountRoomsResult, isClere: boolean): BudgetResult {
  const { gfa, bathrooms, kitchens } = rooms;
  const sqmRate        = isClere ? RATE_CLERESTORY : RATE_STANDARD;
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
    sqmRate,
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

import type { FloorplanJSON, Vertex } from "@/types/floorplan";
import type { Selection } from "@/lib/typologies";
import type { Country } from "@/lib/countries";
import {
  computeBudget,
  estimateAddons,
  type BudgetResult,
  type PricingCurrency,
} from "@/lib/pricing/engine";

export type { BudgetResult, BudgetLine } from "@/lib/pricing/engine";

// ----------------------------------------------------------------------------
// Geometry → indicative budget.
//
// The pricing logic + rates now live in src/lib/pricing (a faithful port of the
// team's Calculation Template, with numbers synced from the workbook). This
// module keeps the DXF-side helpers — room/area counting from the parsed plan —
// and adapts them into the engine's inputs.
// ----------------------------------------------------------------------------

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

/** Map the active country to the pricing engine's native currency. */
export function pricingCurrencyFor(country: Country): PricingCurrency {
  return country.code === "KE" ? "KES" : "UGX";
}

/**
 * Indicative budget for a parsed plan, in the active country's native currency.
 * Structure add-on quantities (partitions, interior doors, exterior
 * doors/windows) default to the workbook's quick-estimate rules derived from
 * GFA + room counts, so the figure isn't understated.
 */
export function calculateBudget(
  rooms: CountRoomsResult,
  selection: Selection,
  country: Country,
): BudgetResult {
  const currency = pricingCurrencyFor(country);
  const est = estimateAddons({
    gfa: rooms.gfa,
    bedrooms: rooms.bedrooms,
    bathrooms: rooms.bathrooms,
  });
  return computeBudget({
    selection,
    currency,
    gfa: rooms.gfa,
    bathrooms: rooms.bathrooms,
    kitchens: rooms.kitchens,
    partitionsM: est.partitionsM,
    interiorDoors: est.interiorDoors,
    extDoorWindowM2: est.extDoorWindowM2,
  });
}

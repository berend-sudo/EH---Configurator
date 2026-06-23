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

// ── Opening geometry (doors & windows) ───────────────────────────────────────
// Both real windows AND the exterior (sliding/glass) doors are drawn on the
// `Windows` layer as thin closed rectangles (the short side ≈ wall thickness,
// the long side = the opening width). The architect's convention, confirmed
// with the team: an opening that fronts a `Rooms$Terrace` polygon is an
// exterior DOOR; any other glazed opening is a WINDOW. The `Doors` layer holds
// only the interior swing doors (one open polyline each, ~700 mm wide).
//
//   exterior door area = width × 2.4 m   (door height)
//   window area        = width × 1.4 m   (window height)
//
// Width is the opening's long bbox dimension. Windows translate rigidly with
// the width slider (all vertices share one moveX), so the width is invariant —
// but we apply `delta` to both openings and terraces so the terrace-adjacency
// test stays aligned as the plan stretches.
const DOOR_HEIGHT_M = 2.4;
const WINDOW_HEIGHT_M = 1.4;

interface BBox { minX: number; minY: number; maxX: number; maxY: number }

function bboxOf(verts: Vertex[], delta: number): BBox {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const v of verts) {
    const x = v.x + (v.moveX ? delta : 0);
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
  }
  return { minX, minY, maxX, maxY };
}

// An opening "fronts" a terrace when it nearly touches the terrace across its
// thin (wall-normal) axis AND overlaps it along its long (wall-parallel) axis.
// The thin-axis gap absorbs the wall thickness (~127 mm); the parallel-overlap
// requirement rejects a window on the same wall but offset past the terrace's
// extent (which would otherwise read as "close" by raw distance alone).
const TERRACE_PERP_TOL_MM = 250;

function frontsTerrace(o: BBox, terraces: BBox[]): boolean {
  const horizontal = o.maxX - o.minX >= o.maxY - o.minY;
  for (const t of terraces) {
    const gapX = Math.max(o.minX - t.maxX, t.minX - o.maxX, 0);
    const gapY = Math.max(o.minY - t.maxY, t.minY - o.maxY, 0);
    const perpGap = horizontal ? gapY : gapX;
    const parallelOverlap = horizontal
      ? Math.min(o.maxX, t.maxX) - Math.max(o.minX, t.minX)
      : Math.min(o.maxY, t.maxY) - Math.max(o.minY, t.minY);
    if (perpGap <= TERRACE_PERP_TOL_MM && parallelOverlap > 0) return true;
  }
  return false;
}

export interface CountRoomsResult {
  gfa: number;
  terraceArea: number;
  bedrooms: number;
  bathrooms: number;
  kitchens: number;
  /** Interior swing doors — count of entities on the `Doors` layer. */
  interiorDoors: number;
  /** Exterior doors + windows total glazed area (m²), from the `Windows` layer
   *  (doors fronting a terrace at 2.4 m high, windows at 1.4 m). */
  extDoorWindowM2: number;
  /** Sum of all Rooms$Mezzanine footprint areas (m²). The mezzanine is NOT
   *  folded into gfa — it's the upper-floor extent, not ground-floor area. */
  mezzanineAreaM2: number;
}

export function countRooms(plan: FloorplanJSON, delta: number): CountRoomsResult {
  let gfa = 0, terraceArea = 0, bedrooms = 0, bathrooms = 0, kitchens = 0;
  let livingRooms = 0, mezzanineAreaM2 = 0;
  const terraceBoxes: BBox[] = [];

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
      if (isTerrace) {
        terraceArea += area;
        terraceBoxes.push(bboxOf(entity.vertices, delta));
      } else {
        gfa += area;
      }
      if (layer.name.includes("Bath"))    bathrooms++;
      if (layer.name.includes("Kitchen")) kitchens++;
      if (layer.name.includes("Living"))  livingRooms++;
      if (layer.name.includes("Bed"))     bedrooms++; // "Bed Room" or "Bedroom"
    }
  }

  // No DXF tags a kitchen — it's drawn open-plan inside the living room — so
  // assume one kitchen area per habitable home for the plumbing line, as the
  // workbook's "Kitchen areas" input intends. Stays data-driven if a future
  // plan ever carries an explicit Rooms$Kitchen layer.
  if (kitchens === 0 && (livingRooms > 0 || bedrooms > 0)) kitchens = 1;

  // Interior doors: one open polyline per door on the `Doors` layer.
  const doorsLayer = plan.layers.find((l) => l.name === "Doors");
  const interiorDoors = doorsLayer
    ? doorsLayer.entities.filter((e) => e.type === "polyline").length
    : 0;

  // Exterior doors & windows: every glazed opening on the `Windows` layer,
  // classified door-vs-window by whether it fronts a terrace.
  let extDoorWindowM2 = 0;
  const windowsLayer = plan.layers.find((l) => l.name === "Windows");
  if (windowsLayer) {
    for (const entity of windowsLayer.entities) {
      if (entity.type !== "polyline") continue;
      const box = bboxOf(entity.vertices, delta);
      const widthM = Math.max(box.maxX - box.minX, box.maxY - box.minY) / 1000;
      const heightM = frontsTerrace(box, terraceBoxes) ? DOOR_HEIGHT_M : WINDOW_HEIGHT_M;
      extDoorWindowM2 += widthM * heightM;
    }
  }

  return {
    gfa,
    terraceArea,
    bedrooms,
    bathrooms,
    kitchens,
    interiorDoors,
    extDoorWindowM2,
    mezzanineAreaM2,
  };
}

/** Map the active country to the pricing engine's native currency. */
export function pricingCurrencyFor(country: Country): PricingCurrency {
  return country.code === "KE" ? "KES" : "UGX";
}

/**
 * Indicative budget for a parsed plan, in the active country's native currency.
 *
 * Interior doors, exterior doors/windows and the terrace are now MEASURED from
 * the DXF geometry by `countRooms` (door/window count + glazed area + terrace
 * area). Partition-wall length still uses the workbook's `0.3 × GFA`
 * quick-estimate — walls are drawn as filled polygons with no centerline, so a
 * reliable partition meterage can't be extracted from the drawing.
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
    partitionsM: est.partitionsM, // estimate — not measurable from the DXF
    interiorDoors: rooms.interiorDoors, // measured: Doors-layer entity count
    extDoorWindowM2: rooms.extDoorWindowM2, // measured: glazed openings on Windows layer
    terraceM2: rooms.terraceArea, // measured: Rooms$Terrace polygons
  });
}

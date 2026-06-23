// Server-only. Builds the catalog price index: every available DXF priced
// through the real engine at its MIN width and MAX width, in both currencies.
// Drives the budget slider's bounds and the landing/configurator grey-out.
//
// Parsing every DXF (incl. the multi-MB clerestory plans) is expensive, so the
// result is memoised per-process and only rebuilt when the catalog changes
// (filename + mtime signature). Never import this from a client module — it
// uses node:fs. The shape (PriceIndex) lives in the client-safe affordability
// module so it can cross the server→client prop boundary.
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { scanFloorPlans, FLOORPLANS_DIR } from "@/lib/floor-plan-scan";
import { parseDxf } from "@/lib/dxf-parser";
import { countRooms, calculateBudget } from "@/lib/budget";
import { COUNTRIES } from "@/lib/countries";
import type { Bounds, PlanPrice, PriceIndex } from "@/lib/affordability";

const UG = COUNTRIES.find((c) => c.code === "UG")!;
const KE = COUNTRIES.find((c) => c.code === "KE")!;

let cache: { sig: string; index: PriceIndex } | null = null;

function boundsOf(plans: PlanPrice[], c: "UGX" | "KES"): Bounds {
  if (plans.length === 0) return { min: 0, max: 0 };
  let min = Infinity;
  let max = -Infinity;
  for (const p of plans) {
    if (p[c].min < min) min = p[c].min; // cheapest plan at its MIN width
    if (p[c].max > max) max = p[c].max; // priciest plan at its MAX width
  }
  return { min, max };
}

export async function buildPriceIndex(): Promise<PriceIndex> {
  const entries = await scanFloorPlans();

  // Signature: filename + mtime of every scanned plan. Rebuild only on change.
  const sigParts: string[] = [];
  for (const e of entries) {
    try {
      const s = await stat(path.join(FLOORPLANS_DIR, e.file));
      sigParts.push(`${e.file}:${s.mtimeMs}`);
    } catch {
      sigParts.push(`${e.file}:0`);
    }
  }
  const sig = sigParts.sort().join("|");
  if (cache && cache.sig === sig) return cache.index;

  const plans: PlanPrice[] = [];
  for (const e of entries) {
    let content: string;
    try {
      content = await readFile(path.join(FLOORPLANS_DIR, e.file), "utf8");
    } catch {
      continue;
    }
    const plan = parseDxf(content, e.file);
    const roomsMin = countRooms(plan, plan.minDelta);
    const roomsMax = countRooms(plan, plan.maxDelta);
    const ugMin = calculateBudget(roomsMin, e.selection, UG).total;
    if (ugMin <= 0) continue; // no rate row (priced on quotation) — skip
    plans.push({
      file: e.file,
      typology: e.selection.typology,
      subtype: e.selection.subtype,
      bedrooms: e.bedrooms,
      version: e.version,
      UGX: { min: ugMin, max: calculateBudget(roomsMax, e.selection, UG).total },
      KES: {
        min: calculateBudget(roomsMin, e.selection, KE).total,
        max: calculateBudget(roomsMax, e.selection, KE).total,
      },
    });
  }

  const index: PriceIndex = {
    plans,
    bounds: { UGX: boundsOf(plans, "UGX"), KES: boundsOf(plans, "KES") },
  };
  cache = { sig, index };
  return index;
}

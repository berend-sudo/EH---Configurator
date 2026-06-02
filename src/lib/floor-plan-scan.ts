// Server-only. Scans public/floorplans/ and derives the floor-plan registry
// from the on-disk filenames. Never import this from a client module (it uses
// node:fs). Exposed to the client via /api/floor-plans.
import { readdir } from "node:fs/promises";
import path from "node:path";
import { parseDxfFilename } from "@/lib/typologies";
import { planName, type FloorPlanEntry } from "@/lib/floor-plans";

export const FLOORPLANS_DIR = path.join(process.cwd(), "public", "floorplans");

export async function scanFloorPlans(): Promise<FloorPlanEntry[]> {
  let files: string[];
  try {
    files = await readdir(FLOORPLANS_DIR);
  } catch {
    return [];
  }

  const entries: FloorPlanEntry[] = [];
  for (const file of files) {
    if (!file.toLowerCase().endsWith(".dxf")) continue;
    const parsed = parseDxfFilename(file);
    if (!parsed) continue; // skip files that don't conform to the scheme
    entries.push({
      selection: parsed.selection,
      bedrooms: parsed.bedrooms,
      version: parsed.version,
      name: planName(parsed.selection, parsed.bedrooms),
      file,
    });
  }
  return entries;
}

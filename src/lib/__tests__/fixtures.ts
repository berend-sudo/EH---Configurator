import { readFileSync } from "node:fs";
import { join } from "node:path";
import { FLOOR_PLANS } from "@/lib/floor-plans";
import { parseDxf } from "@/lib/dxf-parser";
import type { FloorplanJSON } from "@/types/floorplan";

const DXF_DIR = join(process.cwd(), "public", "floorplans");

export interface PlanFixture {
  id: string;
  bedrooms: number;
  parsed: FloorplanJSON;
}

let cache: PlanFixture[] | null = null;

export function loadAllPlans(): PlanFixture[] {
  if (cache) return cache;
  cache = FLOOR_PLANS.map((entry) => {
    const content = readFileSync(join(DXF_DIR, entry.file), "utf-8");
    return {
      id: entry.id,
      bedrooms: entry.bedrooms,
      parsed: parseDxf(content, entry.file),
    };
  });
  return cache;
}

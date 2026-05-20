// Server-only helper. Imports fs — never import this from a client module.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseDxf } from "@/lib/dxf-parser";
import { FLOOR_PLANS } from "@/lib/floor-plans";
import { calculateBudget, countRooms, detectTypology } from "@/lib/budget";

export type BudgetTable = Record<number, number>;

export async function computeBudgetTable(): Promise<BudgetTable> {
  const table: BudgetTable = {};
  for (const entry of FLOOR_PLANS) {
    const filePath = path.join(process.cwd(), "public", "floorplans", entry.file);
    const text = await readFile(filePath, "utf-8");
    const plan = parseDxf(text, entry.file);
    const rooms = countRooms(plan, plan.minDelta);
    const typology = detectTypology(plan.name);
    table[entry.bedrooms] = calculateBudget(rooms, typology).coreTotal;
  }
  return table;
}

import { NextResponse } from "next/server";
import { computeBudgetTable } from "@/lib/budget-table";

export const runtime = "nodejs";
export const maxDuration = 30;

let cache: Record<number, number> | null = null;

export async function GET() {
  try {
    if (!cache) cache = await computeBudgetTable();
    return NextResponse.json(cache);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Budget table error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

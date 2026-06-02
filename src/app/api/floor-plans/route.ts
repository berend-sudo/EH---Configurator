import { NextResponse } from "next/server";
import { scanFloorPlans } from "@/lib/floor-plan-scan";

export const runtime = "nodejs";
export const maxDuration = 30;
// Re-scan on each request so a freshly-uploaded plan appears without a
// rebuild. The scan is a single readdir + filename parse — cheap.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const plans = await scanFloorPlans();
    return NextResponse.json(plans);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Floor-plan scan error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { makeReference } from "@/lib/server/reference";

export const runtime = "nodejs";
// Force dynamic — every page load gets a fresh reference.
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ reference: makeReference() });
}

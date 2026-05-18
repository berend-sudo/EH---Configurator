import { NextRequest, NextResponse } from "next/server";
import { parseDxf } from "@/lib/dxf-parser";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (!file.name.toLowerCase().endsWith(".dxf"))
    return NextResponse.json({ error: "File must be a .dxf file" }, { status: 400 });

  const text = await file.text();
  const floorplan = parseDxf(text, file.name);
  return NextResponse.json(floorplan);
}

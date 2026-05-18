import { NextRequest, NextResponse } from "next/server";
import { parseDxf } from "@/lib/dxf-parser";
import { FLOOR_PLANS } from "@/lib/floor-plans";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  try {
    const fileName = new URL(req.url).searchParams.get("file");
    const entry = FLOOR_PLANS.find((p) => p.file === fileName);
    if (!entry) {
      return NextResponse.json({ error: "Unknown floor plan" }, { status: 404 });
    }
    const filePath = path.join(process.cwd(), "public", "floorplans", entry.file);
    const text = await readFile(filePath, "utf-8");
    const json = parseDxf(text, entry.file);
    return NextResponse.json(json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Parse error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".dxf")) {
      return NextResponse.json({ error: "File must be a .dxf" }, { status: 400 });
    }
    const text = await file.text();
    const json = parseDxf(text, file.name);
    return NextResponse.json(json);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Parse error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

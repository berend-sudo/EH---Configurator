import { NextRequest, NextResponse } from "next/server";
import { parseDxf } from "@/lib/dxf-parser";

export const runtime = "nodejs";
export const maxDuration = 30;

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

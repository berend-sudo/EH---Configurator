import { NextRequest, NextResponse } from "next/server";
import { parseDxf } from "@/lib/dxf-parser";
import { FLOOR_PLANS } from "@/lib/floor-plans";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 30;

// Server-side memoisation. DXFs ship in `public/floorplans/` and don't change
// at runtime, so a parsed result is valid for the lifetime of the server
// process. Saves ~50-100 ms of disk I/O + parsing on warm requests.
const parsedCache = new Map<string, ReturnType<typeof parseDxf>>();

export async function GET(req: NextRequest) {
  try {
    const fileName = new URL(req.url).searchParams.get("file");
    const entry = FLOOR_PLANS.find((p) => p.file === fileName);
    if (!entry) {
      return NextResponse.json({ error: "Unknown floor plan" }, { status: 404 });
    }
    let json = parsedCache.get(entry.file);
    if (!json) {
      const filePath = path.join(process.cwd(), "public", "floorplans", entry.file);
      const text = await readFile(filePath, "utf-8");
      json = parseDxf(text, entry.file);
      parsedCache.set(entry.file, json);
    }
    return NextResponse.json(json, {
      headers: {
        // Tell the browser the parse is safe to cache too. DXFs are
        // catalogue-stable; if one ever changes we'd rebuild + redeploy.
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    });
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

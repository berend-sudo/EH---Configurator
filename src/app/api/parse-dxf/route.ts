import { NextRequest, NextResponse } from "next/server";
import { parseDxf } from "@/lib/dxf-parser";
import { FLOORPLANS_DIR } from "@/lib/floor-plan-scan";
import { readFile } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 30;

// Accept a bare .dxf filename only — no path separators or traversal. The
// file must live directly in public/floorplans/.
function isSafeDxfName(name: string | null): name is string {
  return (
    !!name &&
    /\.dxf$/i.test(name) &&
    !name.includes("/") &&
    !name.includes("\\") &&
    !name.includes("..")
  );
}

export async function GET(req: NextRequest) {
  try {
    const fileName = new URL(req.url).searchParams.get("file");
    if (!isSafeDxfName(fileName)) {
      return NextResponse.json({ error: "Invalid file name" }, { status: 400 });
    }
    const filePath = path.join(FLOORPLANS_DIR, fileName);
    let text: string;
    try {
      text = await readFile(filePath, "utf-8");
    } catch {
      return NextResponse.json({ error: "Unknown floor plan" }, { status: 404 });
    }
    const json = parseDxf(text, fileName);
    // Plan files are content-addressed (filename is part of the URL) and the
    // parser output is a pure function of the file, so the response is safe to
    // cache aggressively on the browser/CDN. Cuts plan re-visits from ~500ms-1s
    // (parse) to instant.
    return NextResponse.json(json, {
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
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

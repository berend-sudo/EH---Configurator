import { NextRequest, NextResponse } from "next/server";
import { parseDxf } from "@/lib/dxf-parser";
import { FLOORPLANS_DIR } from "@/lib/floor-plan-scan";
import { readFile, stat } from "fs/promises";
import path from "path";

export const runtime = "nodejs";
export const maxDuration = 30;

// In-process cache of parsed plans. Parsing a large DXF is ~200ms+ of pure CPU,
// and the browser/CDN `Cache-Control` below only covers repeat visits — the
// FIRST request for a plan on each warm server instance still re-parses from
// disk. Keyed by filename + mtime so a re-dropped DXF (same name, new mtime)
// invalidates itself automatically, preserving the "drop a file in and it
// appears" contract. We store the already-serialised JSON string to skip both
// the parse and the re-serialise on a hit.
const MAX_CACHED = 32;
const parseCache = new Map<string, string>();

function cacheGet(key: string): string | undefined {
  const hit = parseCache.get(key);
  if (hit !== undefined) {
    // Bump to most-recently-used.
    parseCache.delete(key);
    parseCache.set(key, hit);
  }
  return hit;
}

function cacheSet(key: string, value: string): void {
  parseCache.set(key, value);
  while (parseCache.size > MAX_CACHED) {
    parseCache.delete(parseCache.keys().next().value as string);
  }
}

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
    // Cheap stat first so the cache key can include mtime (auto-invalidates a
    // re-dropped plan). A missing file throws here → 404, same as before.
    let mtimeMs: number;
    try {
      mtimeMs = (await stat(filePath)).mtimeMs;
    } catch {
      return NextResponse.json({ error: "Unknown floor plan" }, { status: 404 });
    }
    const cacheKey = `${fileName}:${mtimeMs}`;

    // Plan files are content-addressed (filename is part of the URL) and the
    // parser output is a pure function of the file, so the response is safe to
    // cache aggressively on the browser/CDN. Cuts plan re-visits from ~200ms+
    // (parse) to instant.
    const headers = {
      "Cache-Control": "public, max-age=86400, s-maxage=86400, immutable",
      "Content-Type": "application/json",
    };

    const cached = cacheGet(cacheKey);
    if (cached !== undefined) {
      return new NextResponse(cached, { headers });
    }

    let text: string;
    try {
      text = await readFile(filePath, "utf-8");
    } catch {
      return NextResponse.json({ error: "Unknown floor plan" }, { status: 404 });
    }
    const body = JSON.stringify(parseDxf(text, fileName));
    cacheSet(cacheKey, body);
    return new NextResponse(body, { headers });
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

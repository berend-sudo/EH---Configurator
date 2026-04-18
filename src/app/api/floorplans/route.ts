import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import type { FloorPlanModel } from "@/types/floorPlan";

export const runtime = "nodejs";

function sanitiseId(id: string): string {
  return id
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "floorplan";
}

async function writeFile(relPath: string, data: Buffer | string): Promise<void> {
  const abs = path.join(process.cwd(), relPath);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, data);
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    model?: FloorPlanModel;
    thumbnailDataUrl?: string;
  } | null;
  if (!body?.model?.id) {
    return NextResponse.json({ error: "model.id is required" }, { status: 400 });
  }
  const id = sanitiseId(body.model.id);
  const filename = `${id}.json`;
  const jsonPath = path.posix.join("data", "floorplans", filename);
  await writeFile(jsonPath, JSON.stringify(body.model, null, 2) + "\n");

  let thumbPath: string | null = null;
  if (body.thumbnailDataUrl) {
    const match = body.thumbnailDataUrl.match(/^data:image\/(png|jpeg);base64,(.+)$/);
    if (match) {
      const ext = match[1] === "jpeg" ? "jpg" : "png";
      const buf = Buffer.from(match[2], "base64");
      thumbPath = path.posix.join("data", "floorplans", `${id}.${ext}`);
      await writeFile(thumbPath, buf);
    }
  }

  return NextResponse.json({ id, jsonPath, thumbPath });
}

export async function GET() {
  const dir = path.join(process.cwd(), "data", "floorplans");
  try {
    const files = await fs.readdir(dir);
    const jsons = files.filter((f) => f.endsWith(".json"));
    return NextResponse.json({ files: jsons });
  } catch {
    return NextResponse.json({ files: [] });
  }
}

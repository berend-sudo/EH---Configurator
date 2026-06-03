import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { parseDxf } from "@/lib/dxf-parser";
import { FLOORPLANS_DIR } from "@/lib/floor-plan-scan";
import { calculateBudget, countRooms, polygonAreaM2, typologyInfoFor } from "@/lib/budget";
import { dxfFilename, parseDxfFilename, selectionLabel } from "@/lib/typologies";
import { pdfFilename } from "@/lib/design-id";
import { isClientInfoValid, type SubmitPayload } from "@/lib/configurator-submit";
import { renderDesignPdf, type RoomColorKey } from "@/lib/server/design-pdf";
import { sendDesignEmail } from "@/lib/server/email";
import { appendLead } from "@/lib/server/sheets";

export const runtime = "nodejs";
export const maxDuration = 60;

function roomDisplayName(layerName: string): string {
  if (layerName === "Rooms") return "Room";
  return layerName.replace(/^Rooms\s*[$\-]\s*/, "");
}

function colorKeyFor(layerName: string): RoomColorKey {
  if (layerName.includes("Bath")) return "bath";
  if (layerName.includes("Terrace")) return "terrace";
  return "living";
}

export async function POST(req: NextRequest) {
  let payload: SubmitPayload;
  try {
    payload = (await req.json()) as SubmitPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { selection, bedrooms, client, reference } = payload ?? {};
  if (!selection?.file || !client || !reference || !isClientInfoValid(client)) {
    return NextResponse.json({ error: "Invalid or incomplete submission." }, { status: 400 });
  }

  // The filename is the authority: parseDxfFilename validates the scheme (so no
  // path traversal is possible) and yields the canonical selection/bedrooms/version.
  const parsed = parseDxfFilename(selection.file);
  if (!parsed) {
    return NextResponse.json({ error: "Unknown floor plan." }, { status: 400 });
  }
  const sel = parsed.selection;
  const planBedrooms = parsed.bedrooms;
  const version = parsed.version;

  let plan;
  try {
    const filePath = path.join(FLOORPLANS_DIR, selection.file);
    const text = await readFile(filePath, "utf-8");
    plan = parseDxf(text, selection.file);
  } catch {
    return NextResponse.json({ error: "Could not load the floor plan." }, { status: 500 });
  }

  // ── Authoritative geometry + budget computed server-side from the DXF ──────
  const delta = Math.min(
    Math.max(Number(selection.delta) || plan.minDelta, plan.minDelta),
    plan.maxDelta,
  );
  const rooms = countRooms(plan, delta);
  const typology = typologyInfoFor(sel);
  const budget = calculateBudget(rooms, typology);

  const widthM = (plan.baseWidth + delta) / 1000;
  const lengthM = plan.baseDepth / 1000;
  const footprintM2 = rooms.gfa + rooms.terraceArea;

  const dxfName = dxfFilename(sel, planBedrooms, version);
  const pdfName = pdfFilename(sel, planBedrooms, version);
  const label = `${selectionLabel(sel)} · ${planBedrooms === 0 ? "Studio" : `${planBedrooms}-bed`}`;
  const subject = `Your Easy Housing design — ${label}`;
  const generatedDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Per-room-type breakdown for the PDF legend.
  const roomMap = new Map<string, { name: string; areaM2: number; colorKey: RoomColorKey }>();
  for (const layer of plan.layers) {
    if (!layer.name.startsWith("Rooms")) continue;
    if (layer.name.includes("Mezzanine")) continue; // upper-floor extent, not GFA
    const name = roomDisplayName(layer.name);
    const colorKey = colorKeyFor(layer.name);
    for (const e of layer.entities) {
      if (e.type !== "polyline" || !e.closed) continue;
      const area = polygonAreaM2(e.vertices, delta);
      const cur = roomMap.get(name) ?? { name, areaM2: 0, colorKey };
      cur.areaM2 += area;
      roomMap.set(name, cur);
    }
  }
  const roomBreakdown = Array.from(roomMap.values());

  // ── Generate the PDF ───────────────────────────────────────────────────────
  let pdf: Buffer;
  try {
    pdf = await renderDesignPdf({
      plan,
      delta,
      label,
      bedrooms: planBedrooms,
      reference,
      generatedDate,
      client: { name: client.name, email: client.email },
      dimensions: { widthM, lengthM, footprintM2 },
      budget: {
        core: budget.lines.core,
        optional: budget.lines.optional,
        coreTotal: budget.coreTotal,
        grandTotal: budget.grandTotal,
      },
      rooms: roomBreakdown,
    });
  } catch (e) {
    console.error("[configurator/submit] PDF generation failed:", e);
    return NextResponse.json({ error: "We couldn't generate your PDF — please try again." }, { status: 500 });
  }

  // ── Email the PDF — best-effort. The client always gets the PDF in the
  //    response, so a missing RESEND_API_KEY degrades gracefully to download. ──
  let emailed = false;
  try {
    await sendDesignEmail({
      to: client.email,
      name: client.name,
      subject,
      label,
      reference,
      pdf,
      pdfFilename: pdfName,
    });
    emailed = true;
  } catch (e) {
    console.error("[configurator/submit] email send skipped/failed:", e);
  }

  // ── Log the lead to the Google Sheet — best-effort, never blocks. ──────────
  let logged = false;
  try {
    await appendLead([
      new Date().toISOString(),
      reference,
      client.name,
      client.email,
      client.phone,
      client.timeline,
      typology.name,
      sel.subtype ?? "",
      planBedrooms,
      widthM.toFixed(2),
      lengthM.toFixed(2),
      footprintM2.toFixed(2),
      Math.round(budget.coreTotal),
      dxfName,
      pdfName,
      payload.source ?? "",
    ]);
    logged = true;
  } catch (e) {
    console.error("[configurator/submit] sheet append skipped/failed:", e);
  }

  return NextResponse.json({
    ok: true,
    emailed,
    logged,
    reference,
    pdfFilename: pdfName,
    pdfBase64: pdf.toString("base64"),
  });
}

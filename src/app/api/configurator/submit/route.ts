import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { parseDxf } from "@/lib/dxf-parser";
import { FLOOR_PLANS } from "@/lib/floor-plans";
import {
  calculateBudget,
  countRooms,
  detectTypology,
  polygonAreaM2,
} from "@/lib/budget";
import { dxfFilename, pdfFilename, validateReference, versionFromFile } from "@/lib/design-id";
import { isClientInfoValid, type SubmitPayload } from "@/lib/configurator-submit";
import { renderDesignPdf, type RoomColorKey } from "@/lib/server/design-pdf";
import { sendDesignEmail } from "@/lib/server/email";
import { appendLead } from "@/lib/server/sheets";
import { uploadPdfToBacklog } from "@/lib/server/drive";
import { submitToLeadsForm } from "@/lib/server/forms";
import { makeReference } from "@/lib/server/reference";

export const runtime = "nodejs";
export const maxDuration = 60;

const EMAIL_FAIL = "We couldn't email your design — please check the address and try again.";

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

  const { selection, bedrooms, client } = payload ?? {};
  if (!selection || !client || !isClientInfoValid(client)) {
    return NextResponse.json({ error: "Invalid or incomplete submission." }, { status: 400 });
  }
  // Server is authoritative for the reference id. Trust the client only if
  // the value matches our format; otherwise mint a fresh one. This keeps the
  // id collision-resistant even if the client never called /reference.
  const reference = validateReference(payload.reference) ? payload.reference : makeReference();

  const entry = FLOOR_PLANS.find((p) => p.file === selection.file);
  if (!entry) {
    return NextResponse.json({ error: "Unknown floor plan." }, { status: 400 });
  }

  // ── Authoritative geometry + budget computed server-side from the DXF ──────
  let plan;
  try {
    const filePath = path.join(process.cwd(), "public", "floorplans", entry.file);
    const text = await readFile(filePath, "utf-8");
    plan = parseDxf(text, entry.file);
  } catch {
    return NextResponse.json({ error: "Could not load the floor plan." }, { status: 500 });
  }

  const delta = Math.min(Math.max(Number(selection.delta) || plan.minDelta, plan.minDelta), plan.maxDelta);
  const rooms = countRooms(plan, delta);
  const typology = detectTypology(plan.name);
  const budget = calculateBudget(rooms, typology);

  const widthM = (plan.baseWidth + delta) / 1000;
  const lengthM = plan.baseDepth / 1000;
  const footprintM2 = rooms.gfa + rooms.terraceArea;

  const version = versionFromFile(entry.file);
  const dxfName = dxfFilename(selection, entry.bedrooms, version);
  const pdfName = pdfFilename(selection, entry.bedrooms, version);
  const label = selection.label;
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
      bedrooms: entry.bedrooms,
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
    return NextResponse.json({ emailed: false, error: EMAIL_FAIL }, { status: 500 });
  }

  // ── 1. Email the PDF — the gating success signal ───────────────────────────
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
  } catch (e) {
    console.error("[configurator/submit] email send failed:", e);
    return NextResponse.json({ emailed: false, error: EMAIL_FAIL }, { status: 502 });
  }

  // ── 2. Archive the PDF to Drive ────────────────────────────────────────────
  // Run first so the sheet row + form row can carry the viewer link. Failure
  // is logged but doesn't block the request — the client already has the PDF
  // by email.
  let pdfDriveLink = "";
  let archived = false;
  try {
    const up = await uploadPdfToBacklog({
      filename: pdfName,
      pdf,
      reference,
      label,
    });
    pdfDriveLink = up.webViewLink;
    archived = true;
  } catch (e) {
    console.error("[configurator/submit] drive upload failed (no backlog entry):", e);
  }

  // ── 3. Sheet + form submission run in parallel — both best-effort ─────────
  const sheetRow = [
    new Date().toISOString(),
    reference,
    client.name,
    client.email,
    client.phone,
    client.timeline,
    typology.name,
    selection.subtype ?? "",
    bedrooms,
    widthM.toFixed(2),
    lengthM.toFixed(2),
    footprintM2.toFixed(2),
    Math.round(budget.coreTotal),
    dxfName,
    pdfName,
    pdfDriveLink,
    payload.source ?? "",
  ];
  const formValues: Record<string, string> = {
    name: client.name,
    email: client.email,
    phone: client.phone,
    timeline: client.timeline,
    reference,
    floorPlan: label,
    bedrooms: String(bedrooms),
    widthM: widthM.toFixed(2),
    lengthM: lengthM.toFixed(2),
    footprintM2: footprintM2.toFixed(2),
    indicativeBudgetUgx: String(Math.round(budget.coreTotal)),
    dxfFilename: dxfName,
    pdfFilename: pdfName,
    pdfDriveLink,
    source: payload.source ?? "",
  };

  const [sheetRes, formRes] = await Promise.allSettled([
    appendLead(sheetRow),
    submitToLeadsForm(formValues),
  ]);
  const logged = sheetRes.status === "fulfilled";
  const formSubmitted = formRes.status === "fulfilled";
  if (sheetRes.status === "rejected") {
    console.error("[configurator/submit] sheet append failed (lead not logged):", sheetRes.reason);
  }
  if (formRes.status === "rejected") {
    console.error("[configurator/submit] form submission failed:", formRes.reason);
  }

  return NextResponse.json({
    emailed: true,
    archived,
    logged,
    formSubmitted,
    reference,
    pdfFilename: pdfName,
  });
}

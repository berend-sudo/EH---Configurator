import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { parseDxf } from "@/lib/dxf-parser";
import {
  calculateBudget,
  countRooms,
  polygonAreaM2,
  typologyInfoFor,
} from "@/lib/budget";
import { dxfFilename, parseDxfFilename } from "@/lib/typologies";
import { pdfFilename, validateReference } from "@/lib/design-id";
import { isClientInfoValid, type SubmitPayload } from "@/lib/configurator-submit";
import { roomColorKey, roomDisplayName, type RoomColorKey } from "@/lib/rooms";
import { renderDesignPdf } from "@/lib/server/design-pdf";
import { sendDesignEmail } from "@/lib/server/email";
import { appendLead } from "@/lib/server/sheets";
import { uploadPdfToBacklog } from "@/lib/server/drive";
import { submitToLeadsForm } from "@/lib/server/forms";
import { makeReference } from "@/lib/server/reference";

export const runtime = "nodejs";
export const maxDuration = 60;

const EMAIL_FAIL = "We couldn't email your design — please check the address and try again.";

export async function POST(req: NextRequest) {
  let payload: SubmitPayload;
  try {
    payload = (await req.json()) as SubmitPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { selection, client } = payload ?? {};
  if (!selection || !client || !isClientInfoValid(client)) {
    return NextResponse.json({ error: "Invalid or incomplete submission." }, { status: 400 });
  }
  // Server is authoritative for the reference id. Trust the client only if
  // the value matches our format; otherwise mint a fresh one. This keeps the
  // id collision-resistant even if the client never called /reference.
  const reference = validateReference(payload.reference) ? payload.reference : makeReference();

  // Re-derive { selection, bedrooms, version } from the file name so a crafted
  // payload can't claim e.g. a 4BR Gable using a Monopitch 0BR DXF.
  const parsed = parseDxfFilename(selection.file);
  if (!parsed) {
    return NextResponse.json({ error: "Unknown floor plan." }, { status: 400 });
  }
  const { selection: parsedSel, bedrooms: parsedBedrooms, version: parsedVersion } = parsed;

  // ── Authoritative geometry + budget computed server-side from the DXF ──────
  let plan;
  try {
    const filePath = path.join(process.cwd(), "public", "floorplans", selection.file);
    const text = await readFile(filePath, "utf-8");
    plan = parseDxf(text, selection.file);
  } catch {
    return NextResponse.json({ error: "Could not load the floor plan." }, { status: 500 });
  }

  const delta = Math.min(Math.max(Number(selection.delta) || plan.minDelta, plan.minDelta), plan.maxDelta);
  const rooms = countRooms(plan, delta);
  const typology = typologyInfoFor(parsedSel);
  const budget = calculateBudget(rooms, typology);

  const widthM = (plan.baseWidth + delta) / 1000;
  const lengthM = plan.baseDepth / 1000;
  const footprintM2 = rooms.gfa + rooms.terraceArea;

  const dxfName = dxfFilename(parsedSel, parsedBedrooms, parsedVersion);
  const pdfName = pdfFilename(parsedSel, parsedBedrooms, parsedVersion);
  const label = selection.label || typology.name;
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
    const colorKey = roomColorKey(layer.name);
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
      bedrooms: parsedBedrooms,
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
    parsedSel.subtype ?? "",
    parsedBedrooms,
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
    // Placeholder mirror fields — Wolf maps these logical keys to the real
    // entry.* ids when the form questions are wired up (Phase 6).
    country: client.country,
    projectType: client.projectType ?? "",
    hearAbout: client.hearAbout ?? "",
    reference,
    floorPlan: label,
    bedrooms: String(parsedBedrooms),
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

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
import {
  HEAR_ABOUT_OPTIONS,
  isClientInfoValid,
  type SubmitPayload,
} from "@/lib/configurator-submit";
import { roomColorKey, roomDisplayName, type RoomColorKey } from "@/lib/rooms";
import { renderDesignPdf } from "@/lib/server/design-pdf";
import { sendDesignEmail } from "@/lib/server/email";
import { appendLead } from "@/lib/server/sheets";
import { BASE_COUNTRY, getCountryByCode, ugxToLocal } from "@/lib/countries";
import { uploadPdfToBacklog } from "@/lib/server/drive";
import { GOOGLE_FORM_OTHER, submitToLeadsForm } from "@/lib/server/forms";
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

  // Country chosen at the gate drives the display currency. Falls back to the
  // base currency (Uganda / UGX) if the payload arrives without it or with an
  // unknown code — pricing math stays in UGX either way.
  const country = getCountryByCode(payload.country ?? null) ?? BASE_COUNTRY;

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
  // Single canonical "footprint" = gross width × length. Matches the W × L
  // dimensions printed on the plan page and the foundation line on the spec
  // page. Internal/net area lives in the per-room legend; never lump the
  // two under one label.
  const footprintM2 = widthM * lengthM;

  const dxfName = dxfFilename(parsedSel, parsedBedrooms, parsedVersion);
  const pdfName = pdfFilename(parsedSel, parsedBedrooms, parsedVersion);
  const label = selection.label || typology.name;
  const subject = `Your Easy Housing design — ${label}`;
  const generatedDate = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Per-polyline room legend for the PDF. Each closed polyline becomes one
  // entry so a 2-bed plan reads "Bedroom 1 · 12.4 m²" + "Bedroom 2 · 14.0 m²"
  // rather than a single combined "Bedroom · 26.4 m²". Numbering kicks in
  // only when a label appears more than once.
  const rawRooms: { name: string; areaM2: number; colorKey: RoomColorKey }[] = [];
  for (const layer of plan.layers) {
    if (!layer.name.startsWith("Rooms")) continue;
    if (layer.name.includes("Mezzanine")) continue; // mezzanine is upper floor, not part of the ground-floor legend
    const name = roomDisplayName(layer.name);
    const colorKey = roomColorKey(layer.name);
    for (const e of layer.entities) {
      if (e.type !== "polyline" || !e.closed) continue;
      rawRooms.push({ name, areaM2: polygonAreaM2(e.vertices, delta), colorKey });
    }
  }
  const nameCount = new Map<string, number>();
  for (const r of rawRooms) nameCount.set(r.name, (nameCount.get(r.name) ?? 0) + 1);
  const seen = new Map<string, number>();
  const roomBreakdown = rawRooms.map((r) => {
    const total = nameCount.get(r.name) ?? 1;
    if (total <= 1) return r;
    const n = (seen.get(r.name) ?? 0) + 1;
    seen.set(r.name, n);
    return { ...r, name: `${r.name} ${n}` };
  });

  // The drawing's actual bedroom count drives the cover claim — a DXF whose
  // filename says "2BR" but draws only one bedroom shouldn't ship a PDF
  // headlined "2-bedroom" over a 1-bed plan. We count "Bedroom" polylines
  // from the normalised legend (not `countRooms.bedrooms`, which still
  // matches the legacy "Bedroom" CamelCase layer name and misses the
  // "Bed Room" form most DXFs ship with).
  //
  // Two exceptions keep the headline aligned with the brief:
  //  - A Studio (parsedBedrooms === 0) stays a Studio even when the DXF
  //    labels the sleeping nook as a Bedroom polyline — that's a layout
  //    convention, not a bedroom count.
  //  - When the drawing has zero bedroom polylines we fall back to the
  //    filename so a missing legend doesn't silently flip a 2-bed plan
  //    into a Studio on the cover.
  //
  // TODO(plans): re-author any mismatched DXFs so parsedBedrooms ===
  // drawnBedrooms — until then, the headline follows the drawing.
  const drawnBedrooms = rawRooms.filter((r) => r.name === "Bedroom").length;
  const actualBedrooms =
    parsedBedrooms === 0 || drawnBedrooms === 0 ? parsedBedrooms : drawnBedrooms;

  // ── Generate the PDF ───────────────────────────────────────────────────────
  let pdf: Buffer;
  try {
    pdf = await renderDesignPdf({
      plan,
      delta,
      label,
      bedrooms: actualBedrooms,
      typology: parsedSel.typology,
      subtype: parsedSel.subtype,
      reference,
      generatedDate,
      client: { name: client.name, email: client.email },
      dimensions: { widthM, lengthM, footprintM2 },
      indicativeBudgetUgx: budget.coreTotal,
      rooms: roomBreakdown,
      country,
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
      bedrooms: actualBedrooms,
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
  // UGX is the canonical figure architects price in; `Indicative budget
  // (local)` is what the client saw on screen and is rounded to the
  // currency's display step. Order must match LEADS_HEADER.
  const indicativeLocal = ugxToLocal(budget.coreTotal, country);
  const newsletterYesNo = client.newsletter ? "Yes" : "No";
  const sheetRow = [
    reference,
    new Date().toISOString(),
    client.email,
    client.name,
    client.phone,
    client.country,
    client.projectType,
    client.landFunds,
    client.hearAbout,
    newsletterYesNo,
    client.timeline,
    typology.name,
    parsedSel.subtype ?? "",
    parsedBedrooms,
    widthM.toFixed(2),
    lengthM.toFixed(2),
    footprintM2.toFixed(2),
    Math.round(budget.coreTotal),
    country.currency.code,
    indicativeLocal,
    dxfName,
    pdfName,
    pdfDriveLink,
    payload.source ?? "",
  ];
  // "How did you hear about us?" carries a free-text answer when the user
  // picked "Other" — its value is then NOT one of the enumerated options.
  // A Google Forms multiple-choice question only accepts that via the
  // "__other_option__" sentinel on the radio entry plus the typed text on a
  // companion `.other_option_response` field (logical key `hearAboutOther`,
  // mapped in EH_LEADS_FORM_FIELD_IDS_JSON). The leads sheet always gets the
  // literal answer regardless of this split.
  const hearAbout = client.hearAbout ?? "";
  const hearAboutIsOther =
    hearAbout !== "" && !(HEAR_ABOUT_OPTIONS as readonly string[]).includes(hearAbout);
  const formValues: Record<string, string> = {
    name: client.name,
    email: client.email,
    phone: client.phone,
    timeline: client.timeline,
    country: client.country,
    projectType: client.projectType ?? "",
    hearAbout: hearAboutIsOther ? GOOGLE_FORM_OTHER : hearAbout,
    hearAboutOther: hearAboutIsOther ? hearAbout : "",
    landFunds: client.landFunds ?? "",
    newsletter: newsletterYesNo,
    reference,
    floorPlan: label,
    bedrooms: String(parsedBedrooms),
    widthM: widthM.toFixed(2),
    lengthM: lengthM.toFixed(2),
    footprintM2: footprintM2.toFixed(2),
    indicativeBudgetUgx: String(Math.round(budget.coreTotal)),
    // Gate country + the local-currency mirror; Wolf maps these logical keys
    // to entry ids when the form questions are wired up.
    countryCode: country.code,
    currency: country.currency.code,
    indicativeBudgetLocal: String(indicativeLocal),
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

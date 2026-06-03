import { dxfFilename } from "@/lib/typologies";
import type { Selection } from "@/lib/typologies";

// PDF artefact naming — mirrors the DXF naming scheme so the email
// attachment, sheet row, Drive backlog filename and email subject line all
// share one id. `dxfFilename` in `src/lib/typologies.ts` is the canonical
// builder; this helper just swaps the extension. Route every PDF reference
// through here so the chip on the page, the email attachment and the sheet
// row never drift.

export function pdfFilename(sel: Selection, bedrooms: number, version: number): string {
  return dxfFilename(sel, bedrooms, version).replace(/\.dxf$/i, ".pdf");
}

// EH-YYYY-XXXXXX reference shown on the page, the PDF cover, the email subject
// footer, the Drive backlog filename description, the form row, and the sheet
// row. Format: `EH-` + 4-digit year + `-` + 6 base32 chars [A-Z2-7]. A 32^6
// ≈ 1 B per-year space — collision-free in practice for our volume.
//
// `makeReference` lives in `src/lib/server/reference.ts` (uses crypto.randomBytes),
// so importers in client components don't pull `crypto` into the browser bundle.
// Validation is pure regex and safe in both contexts.
export const REFERENCE_RE = /^EH-\d{4}-[A-Z2-7]{6}$/;

export function validateReference(s: unknown): s is string {
  return typeof s === "string" && REFERENCE_RE.test(s);
}

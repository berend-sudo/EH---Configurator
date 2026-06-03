import type { LandingRoof } from "@/lib/budget";

// Output artefact naming — the DXF the architects receive and the PDF we email
// share one scheme: EH_<TYP>[-<SUB>]_<BR>BR_v<n>.<ext>. This module is the
// single source of truth; route every filename through dxfFilename / pdfFilename
// so the chip on the page, the email attachment and the sheet row never drift.

export interface DesignSelection {
  roof: LandingRoof;
  /** Optional typology subtype code, e.g. "STD" | "LRG" | "CMP". Monopitch has none. */
  subtype?: string | null;
}

const TYP_CODE: Record<LandingRoof, string> = {
  monopitch: "MONO",
  gable: "GABLE",
  clerestory: "CLER",
};

function baseName(sel: DesignSelection, bedrooms: number, version: number): string {
  const typ = TYP_CODE[sel.roof] ?? "MONO";
  const sub = sel.subtype ? `-${sel.subtype}` : "";
  return `EH_${typ}${sub}_${bedrooms}BR_v${version}`;
}

export const dxfFilename = (sel: DesignSelection, bedrooms: number, version: number): string =>
  `${baseName(sel, bedrooms, version)}.dxf`;

export const pdfFilename = (sel: DesignSelection, bedrooms: number, version: number): string =>
  `${baseName(sel, bedrooms, version)}.pdf`;

// Source DXFs carry a trailing version token ("… v6.dxf"). Pull it out so the
// output filename mirrors the plan revision the architects keep on file.
export function versionFromFile(file: string): number {
  const m = file.match(/v(\d+)\s*\.dxf$/i);
  return m ? Number(m[1]) : 1;
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

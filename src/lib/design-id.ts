import { dxfFilename, type Selection } from "@/lib/typologies";

// Output artefact naming. The DXF the architects receive and the PDF we email
// share one scheme — EH_<TYP>[-<SUB>]_<BR>BR_v<n>.<ext> — sourced from
// `dxfFilename` in typologies.ts (the single source of truth). The PDF name
// just swaps the extension so the chip on the page, the email attachment and
// the sheet row never drift.
export const pdfFilename = (sel: Selection, bedrooms: number, version = 1): string =>
  dxfFilename(sel, bedrooms, version).replace(/\.dxf$/i, ".pdf");

// EH-YYYY-NNNN reference shown on the page, the PDF cover, the email subject
// footer and the sheet row. Generated once per submission (client-side) and
// carried through the payload so a row can always be matched back to its PDF.
export function makeReference(date: Date = new Date()): string {
  const year = date.getFullYear();
  const n = Math.floor(1000 + Math.random() * 9000); // 4-digit, never zero-padded short
  return `EH-${year}-${n}`;
}

export const REFERENCE_RE = /^EH-\d{4}-\d{4}$/;

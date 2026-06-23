// Qualitative description of the indicative budget — shown on the summary
// screen (short form) and the PDF (full form). The framing sentences are static
// brand copy; the "priced separately" bullets are built from the workbook's
// extracted quotation items so they track each upload. No figure here ever adds
// to the total — this is explanatory only.

import type { QuotationItem } from "./engine";

/** Short paragraph for the configurator card and the /summary screen. */
export const BUDGET_BLURB_SHORT =
  "This is an indicative budget for your complete Easy Home, covering the " +
  "structure, interior partitions, doors and windows, paintwork, any terrace " +
  "in your plan, and the electrical and plumbing installations, together with " +
  "architecture and engineering. It is calculated live from your chosen " +
  "typology, floor area, and layout.";

/** Opening sentence for the PDF (currency interpolated by the caller). */
export function budgetBlurbPdfIntro(currencyCode: string): string {
  return (
    `This figure is an indicative budget for your complete Easy Home, in ${currencyCode}. ` +
    "It covers the basic structure, interior partitions, doors and windows, " +
    "paintwork, any terrace in your plan, and the electrical and plumbing " +
    "installations, together with the architecture and engineering for your " +
    "chosen typology, floor area, and layout."
  );
}

export const BUDGET_EXCLUDED_INTRO =
  "The following are priced separately and are not included above, because they " +
  "depend on your final choices, location, and site conditions:";

/** "Item — description." bullets, generated from the extracted quotation items. */
export function excludedBullets(items: QuotationItem[]): string[] {
  return items.map((i) => `${i.label} — ${i.description}`);
}

export const BUDGET_TERMS =
  "Optional extras such as railings, pergolas, and ramps are quoted on " +
  "request. All prices include VAT and are valid for one month. No rights can " +
  "be derived from this indicative budget; your final price is confirmed in " +
  "our written quotation.";

export const BUDGET_SIGNOFF = "A home for everyone, Easy Housing.";

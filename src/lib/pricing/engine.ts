// ============================================================================
// engine.ts — the configurator's indicative-budget engine.
// ----------------------------------------------------------------------------
// A faithful TypeScript port of the "Price Calc" sales-price chain in the
// Easy Housing Calculation Template. All *numbers* come from the generated
// price book (price-book.generated.ts, refreshed via `npm run sync-pricing`);
// this file holds only the *logic* (which the workbook keeps stable — see the
// formula-snapshot tripwire in scripts/extract-price-book.mjs).
//
// The result is the workbook's "Full Easy Home Price" (Price Calc E82/G82):
//   basic structure (GFA × per-m² rate)
//   + structure add-ons (interior doors, partitions, ext. doors/windows, stairs)
//   + additional options (terrace)
//   + services & overheads (electricity, plumbing, architecture, engineering)
//   + distance charge (only > 100 km)
//
// Prices are NATIVE per country — Kenya reads the KES column directly, never
// UGX ÷ FX. The only FX use is the documented fallback for a KES cell the
// workbook leaves blank (handled by `pickRate`).
// ============================================================================

import type { Selection } from "@/lib/typologies";
import { selectionLabel } from "@/lib/typologies";
import { PRICE_BOOK } from "./price-book.generated";
import type { CountryRate, TypologyRate } from "./price-book-types";

export type PricingCurrency = "UGX" | "KES";

export interface BudgetLine {
  label: string;
  amount: number;
}
export interface QuotationItem {
  label: string;
  description: string;
}
export interface BudgetResult {
  currency: PricingCurrency;
  /** Per-home component breakdown, native currency. */
  lines: BudgetLine[];
  /** Full Easy Home Price (per home, incl. VAT) — the indicative budget. */
  total: number;
  /** Basic-structure rate applied (per m², native). */
  sqmRate: number;
  /** total / gfa, for the PDF "/ m²" line. */
  perSqm: number;
  gfa: number;
  /** True when the typology has no rate row (engine can't price it). */
  pricedOnQuotation: boolean;
  /** Lump-sum items shown as descriptions, never added to `total`. */
  quotationItems: QuotationItem[];
}

export interface BudgetInput {
  selection: Selection;
  currency: PricingCurrency;
  /** Gross floor area (m²) — from the DXF geometry. */
  gfa: number;
  bathrooms: number;
  kitchens: number;
  /** Structure add-on quantities. Omit to use the workbook's quick estimates. */
  partitionsM?: number;
  interiorDoors?: number;
  extDoorWindowM2?: number;
  /** Terrace area (m²) — priced as the workbook's "Terrace" additional option. */
  terraceM2?: number;
  extraStairs?: number;
  distanceKm?: number;
}

// Configurator {typology, subtype} → workbook Typology Calculator label prefix.
// The generated labels carry a "(depth)" suffix, so we match by prefix.
const WORKBOOK_LABEL: Record<string, string> = {
  "monopitch:": "Mono Pitch",
  "gable:small": "Small Gable",
  "gable:compact": "Compact Gable",
  "gable:standard": "Standard Gable",
  "gable:large": "Large Gable",
  "clerestory:standard": "Standard Clerestory",
  "clerestory:large": "Large Clerestory",
  "aframe:small": "A Frame Compact",
  "aframe:normal": "A Frame Standard",
  "aframe:large": "A Frame Large",
};

function typologyRateFor(sel: Selection): TypologyRate | null {
  const prefix = WORKBOOK_LABEL[`${sel.typology}:${sel.subtype ?? ""}`];
  if (!prefix) return null;
  return PRICE_BOOK.typologies.find((t) => t.workbookLabel.startsWith(prefix)) ?? null;
}

/** Native rate for the active currency. Missing KES → FX-convert UGX. */
function pickRate(ugx: number, kes: number | null, currency: PricingCurrency): number {
  if (currency === "UGX") return ugx;
  if (kes != null) return kes;
  return ugx * (PRICE_BOOK.fx.kesPerUsd / PRICE_BOOK.fx.ugxPerUsd);
}
const pick = (r: CountryRate, currency: PricingCurrency) => pickRate(r.ugx, r.kes, currency);

/**
 * The workbook's "Project Input" quick-estimate defaults for structure add-ons
 * (the values a salesperson gets before fine-tuning). Used when the caller
 * doesn't supply explicit quantities, so the indicative budget isn't
 * understated by treating add-ons as zero.
 *   Partitions     ≈ 0.3 × GFA      (Project Input G35)
 *   Interior doors ≈ bedrooms + bathrooms + other rooms   (G36)
 *   Ext. doors/win ≈ 0.2 × GFA      (proxy for 0.2 × exterior wall surface)
 */
export function estimateAddons(args: {
  gfa: number;
  bedrooms: number;
  bathrooms: number;
  otherRooms?: number;
}): { partitionsM: number; interiorDoors: number; extDoorWindowM2: number } {
  return {
    partitionsM: 0.3 * args.gfa,
    interiorDoors: args.bedrooms + args.bathrooms + (args.otherRooms ?? 0),
    extDoorWindowM2: 0.2 * args.gfa,
  };
}

export function computeBudget(input: BudgetInput): BudgetResult {
  const { selection, currency, gfa } = input;
  const s = PRICE_BOOK.services;

  const typ = typologyRateFor(selection);
  if (!typ) {
    // No rate row for this typology — surface as "priced on quotation" rather
    // than inventing a number.
    return {
      currency,
      lines: [],
      total: 0,
      sqmRate: 0,
      perSqm: 0,
      gfa,
      pricedOnQuotation: true,
      quotationItems: PRICE_BOOK.quotationItems.map((q) => ({ label: q.label, description: q.description })),
    };
  }

  const sqmRate = pickRate(typ.sqmUgx, typ.sqmKes, currency);
  const ugxC = currency === "UGX";

  const partitionsM = input.partitionsM ?? 0;
  const interiorDoors = input.interiorDoors ?? 0;
  const extDoorWindowM2 = input.extDoorWindowM2 ?? 0;
  const terraceM2 = input.terraceM2 ?? 0;
  const extraStairs = input.extraStairs ?? 0;
  const distanceKm = input.distanceKm ?? 0;

  const basicStructure = gfa * sqmRate;
  const interiorDoorsAmt = interiorDoors * pick(PRICE_BOOK.addons.interiorDoor, currency);
  const partitionsAmt = partitionsM * pick(PRICE_BOOK.addons.partition, currency);
  const extDoorWindowAmt = extDoorWindowM2 * pick(PRICE_BOOK.addons.extDoorWindow, currency);
  const terraceAmt = terraceM2 * pick(PRICE_BOOK.options.terrace, currency);
  const extraStairsAmt = extraStairs * pick(PRICE_BOOK.addons.extraStair, currency);

  const electricity = ugxC
    ? s.electricity.ugxFixed + gfa * s.electricity.ugxPerSqm
    : s.electricity.kesFixed + gfa * s.electricity.kesPerSqm;

  const plumbAreas = input.bathrooms + input.kitchens;
  const plumbing =
    plumbAreas > 0
      ? ugxC
        ? s.plumbing.ugxFixed + plumbAreas * s.plumbing.ugxPerArea
        : s.plumbing.kesFixed + plumbAreas * s.plumbing.kesPerArea
      : 0;

  const architecture = gfa * (ugxC ? s.architecture.ugxPerSqm : s.architecture.kesPerSqm);
  const engineering = ugxC
    ? s.engineering.ugxFixed + gfa * s.engineering.ugxPerSqm
    : s.engineering.kesFixed + gfa * s.engineering.kesPerSqm;

  const distanceRate = ugxC ? s.distance.ugxPerSqmKm : s.distance.kesPerSqmKm;
  const distanceCharge = distanceKm > 100 ? (distanceKm - 100) * gfa * distanceRate : 0;

  // Order mirrors the workbook's Full Easy Home Price (E59:E81).
  const lines: BudgetLine[] = [
    { label: "Basic structure", amount: basicStructure },
    { label: "Interior doors", amount: interiorDoorsAmt },
    { label: "Partition walls", amount: partitionsAmt },
    { label: "Exterior doors & windows", amount: extDoorWindowAmt },
    ...(terraceAmt > 0 ? [{ label: "Terrace", amount: terraceAmt }] : []),
    ...(extraStairsAmt > 0 ? [{ label: "Extra staircase", amount: extraStairsAmt }] : []),
    ...(distanceCharge > 0 ? [{ label: "Distance charge", amount: distanceCharge }] : []),
    { label: "Electrical installation", amount: electricity },
    ...(plumbing > 0 ? [{ label: "Plumbing", amount: plumbing }] : []),
    { label: "Architecture", amount: architecture },
    { label: "Engineering", amount: engineering },
  ];

  const total = lines.reduce((sum, l) => sum + l.amount, 0);

  return {
    currency,
    lines,
    total,
    sqmRate,
    perSqm: gfa > 0 ? total / gfa : 0,
    gfa,
    pricedOnQuotation: false,
    quotationItems: PRICE_BOOK.quotationItems.map((q) => ({ label: q.label, description: q.description })),
  };
}

/** Human label for the selected typology (UI/PDF), unchanged from before. */
export function typologyDisplayLabel(sel: Selection): string {
  return selectionLabel(sel);
}

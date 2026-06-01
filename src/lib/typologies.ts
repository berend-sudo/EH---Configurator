// ============================================================================
// EH typology data model — SINGLE SOURCE OF TRUTH
// ----------------------------------------------------------------------------
// All dimensional values below are transcribed VERBATIM from the spreadsheet
//   docs/Easy Housing - Typology Dimensions.xlsx  (Sheet1, rows 5–14).
// Nothing here is interpolated or hand-estimated. If the sheet changes, edit
// here. Column → field mapping:
//   C Building depth ............. depthMm
//   D Roof inclination (°) ....... roofPitchDeg
//   E Ceiling height (low) ....... ceilingLowMm
//   F Ceiling height (high) ...... ceilingHighMm
//   G Ceiling height (avg) ....... ceilingAvgMm
//   H Eaves depth (front/back) ... eavesFrontBackMm
//   I Eaves depth (sides) ........ eavesSidesMm
//   K "Ceiling height low ceiling high" (clerestory only) ... clerestoryCeilingHighMm
//   L "Ceiling height low ceiling low"  (clerestory only) ... clerestoryCeilingLowMm
// ============================================================================

export type TypologyId = "monopitch" | "gable" | "aframe" | "clerestory";

export interface Dimensions {
  /** Building depth (sheet col C), millimetres. */
  depthMm: number;
  /** Roof inclination (col D), degrees. */
  roofPitchDeg: number;
  /** Ceiling height low (col E), mm. */
  ceilingLowMm: number;
  /** Ceiling height high (col F), mm. */
  ceilingHighMm: number;
  /** Ceiling height average (col G), mm. */
  ceilingAvgMm: number;
  /** Eaves depth front/back (col H), mm. */
  eavesFrontBackMm: number;
  /** Eaves depth sides (col I), mm. */
  eavesSidesMm: number;
  /** Clerestory raised section — "ceiling high" (col K), mm. null when N/A. */
  clerestoryCeilingHighMm: number | null;
  /** Clerestory raised section — "ceiling low" (col L), mm. null when N/A. */
  clerestoryCeilingLowMm: number | null;
}

export interface Subtype extends Dimensions {
  /** Display label, e.g. "Compact". */
  label: string;
  /** 3-letter DXF sub-code, e.g. "CMP". */
  code: string;
  /** Base price (UGX). See PRICING note below. */
  basePrice: number;
}

export interface Typology {
  /** Display label, e.g. "Gable". */
  label: string;
  /** 3-letter DXF code, e.g. "GBL". */
  code: string;
  /** SVG path (viewBox 0 0 56 32) for the picker tile icon. */
  iconPath: string;
  /** Minimum bedrooms this typology supports. Only Monopitch allows 0. */
  minBedrooms: number;
  /**
   * Base price (UGX) for Monopitch (the only typology priced at the typology
   * level, since it has no subtypes). For subtyped typologies the price lives
   * on each subtype and this stays 0. See PRICING note below.
   */
  basePrice: number;
  /** Monopitch carries its own dimensions here (it has no subtype). null otherwise. */
  dims: Dimensions | null;
  /** Subtype map keyed by subtype id, or null for Monopitch. */
  subtypes: Record<string, Subtype> | null;
}

// ----------------------------------------------------------------------------
// PRICING — PLACEHOLDER, pending confirmation.
// The spreadsheet carries NO prices, and the live budget is computed from DXF
// geometry (per-m² rates in lib/budget.ts), not from per-subtype base prices.
// The brief's basePrice + BEDROOM_COST model therefore has no source numbers.
// The values below are provisional so the affordability UI can function; they
// are NOT authoritative. TODO(pricing): replace with confirmed figures.
// ----------------------------------------------------------------------------
export const BEDROOM_COST = 12_000_000; // UGX premium per bedroom — PLACEHOLDER

export const TYPOLOGIES: Record<TypologyId, Typology> = {
  monopitch: {
    label: "Monopitch",
    code: "MNP",
    iconPath: "M 6 28 L 6 14 L 50 6 L 50 28 Z",
    minBedrooms: 0, // supports a 0-bedroom (studio) layout (so does A-frame)
    basePrice: 26_000_000, // PLACEHOLDER
    dims: {
      depthMm: 4972,
      roofPitchDeg: 5,
      ceilingLowMm: 2575,
      ceilingHighMm: 2991,
      ceilingAvgMm: 2783,
      eavesFrontBackMm: 415,
      eavesSidesMm: 310,
      clerestoryCeilingHighMm: null,
      clerestoryCeilingLowMm: null,
    },
    subtypes: null,
  },

  gable: {
    label: "Gable",
    code: "GBL",
    iconPath: "M 6 28 L 6 16 L 28 6 L 50 16 L 50 28 Z",
    minBedrooms: 1,
    basePrice: 0,
    dims: null,
    subtypes: {
      small: {
        label: "Small",
        code: "SML",
        basePrice: 30_000_000, // PLACEHOLDER
        depthMm: 4972,
        roofPitchDeg: 40, // odd one out: steep pitch, very high peak
        ceilingLowMm: 2575,
        ceilingHighMm: 4625,
        ceilingAvgMm: 3600,
        eavesFrontBackMm: 415,
        eavesSidesMm: 310,
        clerestoryCeilingHighMm: null,
        clerestoryCeilingLowMm: null,
      },
      compact: {
        label: "Compact",
        code: "CMP",
        basePrice: 34_000_000, // PLACEHOLDER
        depthMm: 6194,
        roofPitchDeg: 10,
        ceilingLowMm: 2659,
        ceilingHighMm: 3178,
        ceilingAvgMm: 2918.5,
        eavesFrontBackMm: 480,
        eavesSidesMm: 470,
        clerestoryCeilingHighMm: null,
        clerestoryCeilingLowMm: null,
      },
      standard: {
        label: "Standard",
        code: "STD",
        basePrice: 40_000_000, // PLACEHOLDER
        depthMm: 7414,
        roofPitchDeg: 10,
        ceilingLowMm: 2661,
        ceilingHighMm: 3286,
        ceilingAvgMm: 2973.5,
        eavesFrontBackMm: 480,
        eavesSidesMm: 470,
        clerestoryCeilingHighMm: null,
        clerestoryCeilingLowMm: null,
      },
      large: {
        label: "Large",
        code: "LRG",
        basePrice: 52_000_000, // PLACEHOLDER
        depthMm: 9856,
        roofPitchDeg: 10,
        ceilingLowMm: 2669,
        ceilingHighMm: 3512,
        ceilingAvgMm: 3090.5,
        eavesFrontBackMm: 558,
        eavesSidesMm: 470,
        clerestoryCeilingHighMm: null,
        clerestoryCeilingLowMm: null,
      },
    },
  },

  aframe: {
    label: "A-frame",
    code: "AFR",
    // No front/back eaves; steep 60° sides. Simple peaked triangle.
    iconPath: "M 6 28 L 28 6 L 50 28 Z",
    // A-frame also supports a 0-bedroom (studio) layout — confirmed by the
    // EH_AFR-SML_0BR plan. So Monopitch is no longer the *only* studio.
    minBedrooms: 0,
    basePrice: 0,
    dims: null,
    subtypes: {
      small: {
        label: "Small",
        code: "SML",
        basePrice: 30_000_000, // PLACEHOLDER
        depthMm: 3663,
        roofPitchDeg: 60,
        ceilingLowMm: 0, // ceiling-low = 0 (no straight wall; roof meets floor)
        ceilingHighMm: 3256,
        ceilingAvgMm: 1628,
        eavesFrontBackMm: 0, // no front/back eaves
        eavesSidesMm: 300,
        clerestoryCeilingHighMm: null,
        clerestoryCeilingLowMm: null,
      },
      normal: {
        label: "Normal",
        code: "NML",
        basePrice: 36_000_000, // PLACEHOLDER
        depthMm: 4884,
        roofPitchDeg: 60,
        ceilingLowMm: 0,
        ceilingHighMm: 4230,
        ceilingAvgMm: 2115,
        eavesFrontBackMm: 0,
        eavesSidesMm: 300,
        clerestoryCeilingHighMm: null,
        clerestoryCeilingLowMm: null,
      },
      large: {
        label: "Large",
        code: "LRG",
        basePrice: 44_000_000, // PLACEHOLDER
        depthMm: 6106,
        roofPitchDeg: 60,
        ceilingLowMm: 0,
        ceilingHighMm: 5288,
        ceilingAvgMm: 2644,
        eavesFrontBackMm: 0,
        eavesSidesMm: 300,
        clerestoryCeilingHighMm: null,
        clerestoryCeilingLowMm: null,
      },
    },
  },

  clerestory: {
    label: "Clerestory",
    code: "CLR",
    iconPath: "M 6 28 L 6 9 L 24 6 L 24 14 L 50 19 L 50 28 Z",
    minBedrooms: 1,
    basePrice: 0,
    dims: null,
    subtypes: {
      standard: {
        label: "Standard",
        code: "STD",
        basePrice: 46_000_000, // PLACEHOLDER
        depthMm: 7414,
        roofPitchDeg: 10,
        ceilingLowMm: 2873,
        ceilingHighMm: 3855,
        ceilingAvgMm: 3364,
        eavesFrontBackMm: 375,
        eavesSidesMm: 380,
        clerestoryCeilingHighMm: 3281,
        clerestoryCeilingLowMm: 3017,
      },
      large: {
        label: "Large",
        code: "LRG",
        basePrice: 54_000_000, // PLACEHOLDER
        depthMm: 8635,
        roofPitchDeg: 10,
        ceilingLowMm: 2888,
        ceilingHighMm: 3852,
        ceilingAvgMm: 3370,
        eavesFrontBackMm: 420,
        eavesSidesMm: 380,
        clerestoryCeilingHighMm: 3294,
        clerestoryCeilingLowMm: 3006,
      },
    },
  },
};

// Display order for the main typology tile row.
export const TYPOLOGY_ORDER: readonly TypologyId[] = [
  "monopitch",
  "gable",
  "aframe",
  "clerestory",
];

// ----------------------------------------------------------------------------
// Selection: the user's roof choice, replacing the old flat string id.
// subtype is null for Monopitch, a subtype id (key into subtypes) otherwise.
// ----------------------------------------------------------------------------
export interface Selection {
  typology: TypologyId;
  subtype: string | null;
}

/** Resolve the Subtype object for a selection, or null (Monopitch / invalid). */
export function subtypeOf(sel: Selection): Subtype | null {
  const typ = TYPOLOGIES[sel.typology];
  if (!typ.subtypes || !sel.subtype) return null;
  return typ.subtypes[sel.subtype] ?? null;
}

/** The dimensions that apply to a selection (subtype's, or Monopitch's own). */
export function dimensionsOf(sel: Selection): Dimensions | null {
  const sub = subtypeOf(sel);
  if (sub) return sub;
  return TYPOLOGIES[sel.typology].dims;
}

/** Building depth in millimetres for a selection. */
export function depthMmOf(sel: Selection): number | null {
  return dimensionsOf(sel)?.depthMm ?? null;
}

/** Building depth formatted as metres, e.g. "4.97 m". */
export function depthLabel(sel: Selection): string | null {
  const mm = depthMmOf(sel);
  if (mm == null) return null;
  return `${(mm / 1000).toFixed(2)} m`;
}

/** Minimum bedrooms for a selection's typology (0 for Monopitch & A-frame, else 1). */
export function minBedroomsFor(sel: Selection): number {
  return TYPOLOGIES[sel.typology].minBedrooms;
}

/** Human label: "Monopitch" or "Gable Compact". */
export function selectionLabel(sel: Selection): string {
  const typ = TYPOLOGIES[sel.typology];
  const sub = subtypeOf(sel);
  return sub ? `${typ.label} ${sub.label}` : typ.label;
}

/** Default selection for a typology: its first subtype, or null for Monopitch. */
export function defaultSelectionFor(typology: TypologyId): Selection {
  const typ = TYPOLOGIES[typology];
  if (!typ.subtypes) return { typology, subtype: null };
  const firstId = Object.keys(typ.subtypes)[0];
  return { typology, subtype: firstId };
}

// ----------------------------------------------------------------------------
// DXF naming — the ONE place a DXF filename is constructed.
//   EH_<TYP>[-<SUB>]_<BR>BR_v<n>.dxf
// Never hardcode a DXF filename anywhere else; always route through here.
// ----------------------------------------------------------------------------
export function dxfFilename(sel: Selection, bedrooms: number, version = 1): string {
  const typ = TYPOLOGIES[sel.typology];
  const sub = subtypeOf(sel);
  const subPart = sub ? `-${sub.code}` : "";
  return `EH_${typ.code}${subPart}_${bedrooms}BR_v${version}.dxf`;
}

/**
 * Inverse of dxfFilename(): parse a scheme-conformant filename back into a
 * { selection, bedrooms, version }. Returns null when the name doesn't match
 * the scheme or carries codes unknown to the data model — so a directory
 * scan can safely skip stray files. Codes are validated against TYPOLOGIES.
 */
export function parseDxfFilename(
  file: string,
): { selection: Selection; bedrooms: number; version: number } | null {
  const m = /^EH_([A-Za-z]{3})(?:-([A-Za-z]{3}))?_(\d+)BR_v(\d+)\.dxf$/i.exec(file);
  if (!m) return null;
  const [, typCode, subCode, brStr, vStr] = m;

  const tid = (Object.keys(TYPOLOGIES) as TypologyId[]).find(
    (id) => TYPOLOGIES[id].code.toUpperCase() === typCode.toUpperCase(),
  );
  if (!tid) return null;
  const typ = TYPOLOGIES[tid];

  let subtype: string | null = null;
  if (typ.subtypes) {
    if (!subCode) return null; // subtyped typology requires a sub code
    const sid = Object.keys(typ.subtypes).find(
      (s) => typ.subtypes![s].code.toUpperCase() === subCode.toUpperCase(),
    );
    if (!sid) return null;
    subtype = sid;
  } else if (subCode) {
    return null; // Monopitch must not carry a sub code
  }

  return {
    selection: { typology: tid, subtype },
    bedrooms: Number(brStr),
    version: Number(vStr),
  };
}

// ----------------------------------------------------------------------------
// PRICING helpers — basePrice + BEDROOM_COST premium model.
// NOTE: base prices are PLACEHOLDERS (see PRICING note above). The model and
// helper shapes are final; only the numbers are provisional.
// ----------------------------------------------------------------------------

/** Base price (UGX) that applies to a selection — subtype's, or Monopitch's. */
function basePriceOf(sel: Selection): number {
  const sub = subtypeOf(sel);
  return sub ? sub.basePrice : TYPOLOGIES[sel.typology].basePrice;
}

/** Total price for a selection at a given bedroom count. */
export function priceFor(sel: Selection, bedrooms: number): number {
  return basePriceOf(sel) + BEDROOM_COST * bedrooms;
}

/** Cheapest configuration cost for a selection (priced at its min bedrooms). */
export function minCostFor(sel: Selection): number {
  return priceFor(sel, minBedroomsFor(sel));
}

/** Is the selection's cheapest configuration within budget? */
export function isSelectionAffordable(budget: number, sel: Selection): boolean {
  return minCostFor(sel) <= budget;
}

/** Largest affordable bedroom count in [minBedrooms..4]; falls to min if none. */
export function maxBedroomsFor(budget: number, sel: Selection): number {
  const floor = minBedroomsFor(sel);
  for (let b = 4; b >= floor; b--) {
    if (priceFor(sel, b) <= budget) return b;
  }
  return floor;
}

/** Per-typology affordability at the cheapest reachable configuration. */
export function typologyAvailability(budget: number): Record<TypologyId, boolean> {
  const out = {} as Record<TypologyId, boolean>;
  for (const id of TYPOLOGY_ORDER) {
    const typ = TYPOLOGIES[id];
    if (!typ.subtypes) {
      out[id] = isSelectionAffordable(budget, { typology: id, subtype: null });
    } else {
      out[id] = Object.keys(typ.subtypes).some((sub) =>
        isSelectionAffordable(budget, { typology: id, subtype: sub }),
      );
    }
  }
  return out;
}

/** Per-subtype affordability map for a typology (empty for Monopitch). */
export function subtypeAvailability(
  budget: number,
  typology: TypologyId,
): Record<string, boolean> {
  const typ = TYPOLOGIES[typology];
  const out: Record<string, boolean> = {};
  if (!typ.subtypes) return out;
  for (const sub of Object.keys(typ.subtypes)) {
    out[sub] = isSelectionAffordable(budget, { typology, subtype: sub });
  }
  return out;
}

/** Cheapest affordable subtype id for a typology, or null (none / Monopitch). */
export function cheapestAffordableSubtype(
  budget: number,
  typology: TypologyId,
): string | null {
  const typ = TYPOLOGIES[typology];
  if (!typ.subtypes) return null;
  const affordable = Object.entries(typ.subtypes)
    .filter(([, s]) => s.basePrice + BEDROOM_COST * typ.minBedrooms <= budget)
    .sort((a, b) => a[1].basePrice - b[1].basePrice);
  return affordable.length ? affordable[0][0] : null;
}

/**
 * Resolve a selection to one that fits the budget:
 *  - keep it if already affordable;
 *  - else fall back to the cheapest affordable subtype in the same typology;
 *  - else fall back to the cheapest affordable typology (by min cost);
 *  - else return the selection unchanged (everything is over budget — keep
 *    a stable choice while the UI greys everything out).
 */
export function resolveAffordableSelection(budget: number, sel: Selection): Selection {
  if (isSelectionAffordable(budget, sel)) return sel;

  const sameTypology = cheapestAffordableSubtype(budget, sel.typology);
  if (sameTypology) return { typology: sel.typology, subtype: sameTypology };

  const byMinCost = [...TYPOLOGY_ORDER].sort(
    (a, b) =>
      minCostFor(defaultSelectionFor(a)) - minCostFor(defaultSelectionFor(b)),
  );
  for (const id of byMinCost) {
    const candidate = TYPOLOGIES[id].subtypes
      ? { typology: id, subtype: cheapestAffordableSubtype(budget, id) }
      : { typology: id, subtype: null };
    if (candidate.subtype !== undefined && isSelectionAffordable(budget, candidate as Selection)) {
      return candidate as Selection;
    }
  }
  return sel;
}

// ----------------------------------------------------------------------------
// URL (de)serialisation — keeps the selection shareable via query params.
// ----------------------------------------------------------------------------
export function selectionToParams(sel: Selection): Record<string, string> {
  const p: Record<string, string> = { typology: sel.typology };
  if (sel.subtype) p.subtype = sel.subtype;
  return p;
}

/** Parse a selection from raw params, sanitising unknown / mismatched ids. */
export function selectionFromParams(
  typology: string | null,
  subtype: string | null,
): Selection {
  const tid = (typology ?? "") as TypologyId;
  if (!(tid in TYPOLOGIES)) return { typology: "monopitch", subtype: null };
  const typ = TYPOLOGIES[tid];
  if (!typ.subtypes) return { typology: tid, subtype: null };
  if (subtype && subtype in typ.subtypes) return { typology: tid, subtype };
  return defaultSelectionFor(tid);
}

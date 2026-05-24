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
    minBedrooms: 0, // only typology supporting a 0-bedroom (studio) layout
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
    minBedrooms: 1,
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

/** Minimum bedrooms for a selection's typology (0 for Monopitch, else 1). */
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

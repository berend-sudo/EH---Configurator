// Shape of the generated price book (src/lib/pricing/price-book.generated.ts).
// Kept separate so the generated file can be fully data (no hand-maintained
// type declarations) and the engine can import the type from one place.
//
// All monetary rates are NATIVE per country: `ugx` / `kes` are read straight
// from the Uganda and Kenya columns of the workbook's Price Calc sheet. Kenya
// is never derived from Uganda via FX (except the documented missing-cell
// fallback in engine.ts, which uses `fx`).

export interface CountryRate {
  ugx: number;
  /** Native KES rate, or null when the workbook leaves it blank (→ engine
   *  FX-converts the UGX value using `fx`; an explicit 0 stays 0). */
  kes: number | null;
}

export interface TypologyRate {
  /** Exact label in the workbook's Typology Calculator, e.g. "Large Gable (9768)". */
  workbookLabel: string;
  /** Gross building depth (mm) used for the workbook's GFA formula. */
  depthMm: number;
  /** Flank overhang total (mm). */
  flankMm: number;
  /** Basic-structure rate, UGX per m². */
  sqmUgx: number;
  /** Basic-structure rate, KES per m² — null when blank in the workbook. */
  sqmKes: number | null;
}

export interface PriceBook {
  /** Filename of the workbook this was generated from. */
  sourceWorkbook: string;
  /** ISO date the file was generated. */
  generatedAt: string;
  /** Short hash of the engine formulas at generation time (drift tripwire). */
  formulaHash: string;
  /** Stud-module column widths (mm) used by the workbook's width composition. */
  columnWidthsMm: { a: number; b: number; c: number };
  /** Per-typology basic-structure rates + dimensions. */
  typologies: TypologyRate[];
  /** Structure add-on unit prices. */
  addons: {
    interiorDoor: CountryRate; // per pcs
    partition: CountryRate; // per linear metre
    extDoorWindow: CountryRate; // per m²
    extraStair: CountryRate; // per pcs (beyond the first)
  };
  /** Services & overheads coefficients. */
  services: {
    electricity: { ugxFixed: number; ugxPerSqm: number; kesFixed: number; kesPerSqm: number };
    plumbing: { ugxFixed: number; ugxPerArea: number; kesFixed: number; kesPerArea: number };
    architecture: { ugxPerSqm: number; kesPerSqm: number };
    engineering: { ugxFixed: number; ugxPerSqm: number; kesFixed: number; kesPerSqm: number };
    /** Remote-location charge per m² per km beyond the first 100 km. */
    distance: { ugxPerSqmKm: number; kesPerSqmKm: number };
  };
  /** Priced additional options — extracted for future use; not shown yet. */
  options: Record<string, CountryRate>;
  /** Lump-sum items priced case-by-case — shown as descriptions, never summed. */
  quotationItems: { key: string; label: string; description: string }[];
  /** FX (local per USD) from Location Data — only for the missing-KES fallback. */
  fx: { ugxPerUsd: number; kesPerUsd: number };
}

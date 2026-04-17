import type { ComponentAmounts, TypologyId } from "@/types/costEngine";

export interface StandardModel {
  id: string;
  name: string;
  typology: TypologyId;
  bedrooms: number;
  bathrooms: number;
  /** Gross floor area in sqm (Excel B23). */
  gfaSqm: number;
  /**
   * Per-component amounts published in the Excel template.
   * Phase 1 uses these literally; Phase 2 will derive them
   * from frame counts + zone-stretch deltas.
   */
  componentAmounts: ComponentAmounts;
}

/**
 * "Mono Pitch 2BR" — the default configuration in
 * "Project Costs" of the calculation template (column E in the standard
 * models table, "Project Input" rows 22–40).
 *
 * Inputs:
 *   typology   = Mono Pitch (4884)
 *   columnsA/B/C = 2 / 4 / 0
 *   partitions = 27 m
 *   interior doors = 6
 *   aluminium  = 10.5 sqm
 *   bedrooms = 2, bathrooms = 2
 *   GFA = 61.137912 sqm
 *
 * Expected total: ~100,215,294 UGX inclusive VAT (Excel B51).
 */
export const MONO_PITCH_2BR_DEFAULT: StandardModel = {
  id: "mono-pitch-2br-default",
  name: "Mono Pitch 2BR (default template config)",
  typology: "mono-pitch-4884",
  bedrooms: 2,
  bathrooms: 2,
  gfaSqm: 61.137912,
  componentAmounts: {
    // Frames — derived from 2A + 4B + 0C columns at 4884 mm depth
    "floor-frame-2442x1221": 4,
    "floor-frame-2442x2442": 8,
    "wall-frame-2442x2654": 5,
    "wall-frame-2442x2999": 9,
    "partition-wall-frame-per-m1": 27,
    "facade-cladding-per-m2": 93.697698,
    "roof-frame-mono-pitch": 8,
    "roof-frame-mono-pitch-edge": 2,

    // Aluminium (bulk pricing)
    "aluminium-bulk-per-sqm": 10.5,

    // Building materials & works
    "foundation-point": 21,
    "interior-door": 6,
    "roof-sheets-per-sqm": 74.522832,
    "paintworks-per-sqm": 506.05614,
    "pergola-per-sqm": 17,
    "cement-boards-per-bathroom": 2,
    "extra-timber": 1,
    "smoke-detector": 1,
    "fire-extinguisher": 1,

    // Project overhead
    "easy-building-licence-fee": 1,
    "design-fee-siteplan": 1,
    "transport-materials-to-workshop": 1,
    "transport-frames-to-site": 1,
    "transport-foundation-to-site": 1,
    "travel-costs-site-team": 1,
    "accommodation-site-team": 1,
    "workshop-costs": 1,
    "unforeseen-costs": 1,
    "vehicle-tool-maintenance": 1,
    "project-management": 1,
    "aftercare-warranty": 1,
    "account-management": 1,
    "customer-acquisition": 1,
    "placement-labour": 1,
    "cleaning-on-completion": 1,

    // Finishings
    electricity: 1,
    plumbing: 1,
  },
};

export const STANDARD_MODELS: readonly StandardModel[] = [
  MONO_PITCH_2BR_DEFAULT,
];

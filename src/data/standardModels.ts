import type { ComponentAmounts, TypologyId } from "@/types/costEngine";
import { deriveMonoPitchAmounts } from "@/lib/floorPlan/deriveMonoPitchAmounts";

export interface StandardModel {
  id: string;
  name: string;
  typology: TypologyId;
  bedrooms: number;
  bathrooms: number;
  /** Columns A (1221 mm). */
  columnsA: number;
  /** Columns B (2442 mm). */
  columnsB: number;
  /** Columns C (3053 mm). */
  columnsC: number;
  /** Partition wall length (m). */
  partitionsM: number;
  /** Interior doors. */
  interiorDoors: number;
  /** Bulk aluminium (sqm). */
  aluminiumSqm: number;
  /** Gross floor area in sqm (Excel B23). */
  gfaSqm: number;
  /**
   * Per-component amounts published in the Excel template.
   * Phase 1 uses these literally; Phase 2 derives them from the
   * frame counts + zone-stretch deltas via `deriveMonoPitchAmounts`.
   */
  componentAmounts: ComponentAmounts;
}

/**
 * "Mono Pitch 2BR (template default)" — the default configuration in
 * "Project Costs" of the calculation template (columns E24:E34 of
 * "Project Input"). This is the configuration the calibration test
 * targets (≈ 100,215,294 UGX inc VAT, Excel B51).
 *
 *   typology   = Mono Pitch (4884)
 *   columnsA/B/C = 2 / 4 / 0    (2A + 4B + 0C → 12,210 mm structural)
 *   partitions = 27 m
 *   interior doors = 6
 *   aluminium  = 10.5 sqm
 *   bedrooms = 2, bathrooms = 2
 *   GFA = 61.137912 sqm
 */
export const MONO_PITCH_2BR_DEFAULT: StandardModel = makeMonoPitchStandardModel({
  id: "mono-pitch-2br-default",
  name: "Mono Pitch 2BR (template default)",
  bedrooms: 2,
  bathrooms: 2,
  columnsA: 2,
  columnsB: 4,
  columnsC: 0,
  partitionsM: 27,
  interiorDoors: 6,
  aluminiumSqm: 10.5,
  pergolaSqm: 17,
});

/**
 * "Mono Pitch 1BR" — row F45:F56 of the standard-models table in
 * "Project Costs". Baseline for the 1-bedroom Mono-Pitch floor plan.
 *
 *   columnsA/B/C = 0 / 0 / 2   (2C → 6,106 mm structural)
 *   partitions = 6 m
 *   interior doors = 2
 *   aluminium = 7.9 sqm
 *   bathrooms = 1
 */
export const MONO_PITCH_1BR_DEFAULT: StandardModel = makeMonoPitchStandardModel({
  id: "mono-pitch-1br-default",
  name: "Mono Pitch 1BR (standard)",
  bedrooms: 1,
  bathrooms: 1,
  columnsA: 0,
  columnsB: 0,
  columnsC: 2,
  partitionsM: 6,
  interiorDoors: 2,
  aluminiumSqm: 7.9,
});

/**
 * "Mono Pitch 2BR (standard)" — row G45:G56 of the standard-models table.
 * This is the configuration the floor-plan renderer uses as its base
 * (0A + 1B + 2C, 8,547 mm structural length).
 */
export const MONO_PITCH_2BR_STANDARD: StandardModel = makeMonoPitchStandardModel({
  id: "mono-pitch-2br-standard",
  name: "Mono Pitch 2BR (standard)",
  bedrooms: 2,
  bathrooms: 1,
  columnsA: 0,
  columnsB: 1,
  columnsC: 2,
  partitionsM: 12.5,
  interiorDoors: 3,
  aluminiumSqm: 10.2,
});

export const STANDARD_MODELS: readonly StandardModel[] = [
  MONO_PITCH_1BR_DEFAULT,
  MONO_PITCH_2BR_STANDARD,
  MONO_PITCH_2BR_DEFAULT,
];

interface MonoPitchStandardModelSeed {
  id: string;
  name: string;
  bedrooms: number;
  bathrooms: number;
  columnsA: number;
  columnsB: number;
  columnsC: number;
  partitionsM: number;
  interiorDoors: number;
  aluminiumSqm: number;
  pergolaSqm?: number;
}

function makeMonoPitchStandardModel(
  seed: MonoPitchStandardModelSeed,
): StandardModel {
  const derived = deriveMonoPitchAmounts({
    typology: "mono-pitch-4884",
    columnsA: seed.columnsA,
    columnsB: seed.columnsB,
    columnsC: seed.columnsC,
    partitionsM: seed.partitionsM,
    interiorDoors: seed.interiorDoors,
    aluminiumSqm: seed.aluminiumSqm,
    bathrooms: seed.bathrooms,
    pergolaSqm: seed.pergolaSqm,
  });
  return {
    id: seed.id,
    name: seed.name,
    typology: "mono-pitch-4884",
    bedrooms: seed.bedrooms,
    bathrooms: seed.bathrooms,
    columnsA: seed.columnsA,
    columnsB: seed.columnsB,
    columnsC: seed.columnsC,
    partitionsM: seed.partitionsM,
    interiorDoors: seed.interiorDoors,
    aluminiumSqm: seed.aluminiumSqm,
    gfaSqm: derived.gfaSqm,
    componentAmounts: derived.componentAmounts,
  };
}

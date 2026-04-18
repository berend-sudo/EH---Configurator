import type { ComponentAmounts, TypologyId } from "@/types/costEngine";

/**
 * Inputs for the "Project Input" side of the Excel sheet (column E of
 * Project Costs rows 24–34). Everything needed to reproduce the
 * per-component amount column (A68:A159) from first principles.
 */
export interface MonoPitchInputs {
  typology: Extract<TypologyId, "mono-pitch-4884">;
  columnsA: number;
  columnsB: number;
  columnsC: number;
  partitionsM: number;
  interiorDoors: number;
  aluminiumSqm: number;
  bathrooms: number;
  extraExtWallJumps?: number;
  verandaA?: number;
  verandaB?: number;
  verandaC?: number;
  pergolaSqm?: number;
}

/** GFA and the component-amount map that `calculatePrice` expects. */
export interface DerivedMonoPitchModel {
  gfaSqm: number;
  componentAmounts: ComponentAmounts;
}

/* Frame surface areas (sqm) from Structures Database, column Y. */
const FLOOR_A = 2.981682;   // Floor frame 2442 × 1221
const FLOOR_B = 5.963364;   // Floor frame 2442 × 2442
const FLOOR_C = 7.455426;   // Floor frame 2442 × 3053
const WALL_B_LOW = 6.901092;   // Wall frame 2442 × 2654
const WALL_C_LOW = 8.627778;   // Wall frame 3053 × 2654
const WALL_B_HIGH = 7.743582;  // Wall frame 2442 × 2999
const WALL_C_HIGH = 9.681063;  // Wall frame 3053 × 2999
const ROOF_MONO = 6.995109;    // Roof frame 1221 × 5685
const ROOF_MONO_EDGE = 9.28098; // Roof frame 1598 × 5685
const PARTITION_PER_M = 3;     // partition panel area per linear metre

/**
 * Mono-Pitch-4884 amount derivation — mirrors Excel "Project Costs" row 9
 * (Mono Pitch typology) plus the formulas in column A rows 68–159.
 *
 *   floor A      = 2a           (L9)
 *   floor B      = 2b           (M9)
 *   floor C      = 2c           (N9)
 *   wall B low   = b + 0.5a     (Q9)
 *   wall C low   = c            (R9)
 *   wall B high  = 4 + b + 0.5a + extraExtWall/4  (S9 + row-77 extra)
 *   wall C high  = c            (T9)
 *   roof mono    = a + 2b + 2.5c − 2 (U9)
 *   roof edge    = 2            (V9 constant for mono pitch)
 *   foundation   = 3·(a+b+c+1) + 2·(verandaA+verandaB+verandaC) (row 121)
 *   partitions   = partitionsM                (row 79)
 *   facade sqm   = ext-wall-surface − alu sqm (row 80)
 *   roof sheets  = roof-surface (sqm)         (row 123)
 *   paintworks   = GFA + decking + 2·extWallSurf + partSurf + roofSurf (row 124)
 */
export function deriveMonoPitchAmounts(
  input: MonoPitchInputs,
): DerivedMonoPitchModel {
  const a = input.columnsA;
  const b = input.columnsB;
  const c = input.columnsC;
  const extraExtWall = input.extraExtWallJumps ?? 0;
  const verandaA = input.verandaA ?? 0;
  const verandaB = input.verandaB ?? 0;
  const verandaC = input.verandaC ?? 0;

  const floorA = 2 * a;
  const floorB = 2 * b;
  const floorC = 2 * c;

  const wallBLow = b + 0.5 * a;
  const wallCLow = c;
  const wallBHigh = 4 + b + 0.5 * a + extraExtWall / 4;
  const wallCHigh = c;

  const roofMono = a + 2 * b + 2.5 * c - 2;
  const roofMonoEdge = 2;

  const foundationPoints = 3 * (a + b + c + 1) + 2 * (verandaA + verandaB + verandaC);

  // Surface totals mirror columns V68..V93 = A × U.
  const floorSurface = floorA * FLOOR_A + floorB * FLOOR_B + floorC * FLOOR_C;
  const extWallSurface =
    wallBLow * WALL_B_LOW +
    wallCLow * WALL_C_LOW +
    wallBHigh * WALL_B_HIGH +
    wallCHigh * WALL_C_HIGH;
  const netFacade = extWallSurface - input.aluminiumSqm;
  const roofSurface = roofMono * ROOF_MONO + roofMonoEdge * ROOF_MONO_EDGE;
  const partitionSurface = input.partitionsM * PARTITION_PER_M;

  // GFA (B23) = Σ floor-frame areas + 0.044 × (wall-frame lengths, m).
  //   0.044 is the wall-thickness GFA adjustment used in the Excel.
  const wallLengthsM =
    wallBLow * 2.442 +
    wallCLow * 3.053 +
    wallBHigh * 2.442 +
    wallCHigh * 3.053;
  const gfaSqm = floorSurface + 0.044 * wallLengthsM;

  // Paintworks (B124) — painted surface: GFA + decking(0) + 2·ext walls + 2·partitions + roof.
  //   Excel B29 = V79 × 2 — partitions are painted on both sides.
  const paintworks = gfaSqm + 2 * extWallSurface + 2 * partitionSurface + roofSurface;

  const componentAmounts: ComponentAmounts = {
    "floor-frame-2442x1221": floorA,
    "floor-frame-2442x2442": floorB,
    "floor-frame-2442x3053": floorC,
    "wall-frame-2442x2654": wallBLow,
    "wall-frame-3053x2654": wallCLow,
    "wall-frame-2442x2999": wallBHigh,
    "wall-frame-3053x2999": wallCHigh,
    "partition-wall-frame-per-m1": input.partitionsM,
    "facade-cladding-per-m2": netFacade,
    "roof-frame-mono-pitch": roofMono,
    "roof-frame-mono-pitch-edge": roofMonoEdge,

    "aluminium-bulk-per-sqm": input.aluminiumSqm,

    "foundation-point": foundationPoints,
    "interior-door": input.interiorDoors,
    "roof-sheets-per-sqm": roofSurface,
    "paintworks-per-sqm": paintworks,
    "pergola-per-sqm": input.pergolaSqm ?? 0,
    "cement-boards-per-bathroom": input.bathrooms,
    "extra-timber": 1,
    "smoke-detector": 1,
    "fire-extinguisher": 1,

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

    electricity: 1,
    plumbing: 1,
  };

  return { gfaSqm, componentAmounts };
}

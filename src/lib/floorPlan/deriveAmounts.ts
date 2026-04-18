import type {
  ComponentAmounts,
  ComponentId,
  TypologyId,
} from "@/types/costEngine";
import type { FrameCombo } from "@/lib/frameCombo";
import { FRAME_A_MM, FRAME_B_MM, FRAME_C_MM } from "@/lib/costEngine/constants";

/**
 * Inputs the client can vary per-plan. Mirrors Project Input cells
 * D27 (partitions), E28 (interior doors), E29 (aluminium), E30 (extra
 * exterior wall), E34 (bathrooms).
 */
export interface PlanAmountsInput {
  typology: TypologyId;
  frames: FrameCombo;
  partitionsM: number;
  interiorDoors: number;
  aluminiumSqm: number;
  extraExtWallSteps: number;
  bathrooms: number;
  /** Optional override; when omitted we compute from frames + depth. */
  gfaSqm?: number;
  /** Required for GFA derivation — the typology's structural depth. */
  depthMm: number;
}

export interface DerivedAmounts {
  componentAmounts: ComponentAmounts;
  gfaSqm: number;
  /** Paintable surface (sqm) — mirrors Excel row 124 input. */
  paintableSqm: number;
  /** Roof surface (sqm) — amount for roof sheets. */
  roofSqm: number;
  /** Net facade surface (sqm) — amount for vertical cladding. */
  facadeSqm: number;
}

/**
 * Replicates the Excel `J9` (Mono Pitch) row formulas from the
 * "Project Costs" > "Typologies" lookup:
 *
 *   Floor frame 2442×1221   = 2×A
 *   Floor frame 2442×2442   = 2×B
 *   Floor frame 2442×3053   = 2×C
 *   Foundation points       = 3×(A+B+C+1)
 *   Wall B low              = B + 0.5A
 *   Wall C low              = C
 *   Wall B high             = 4 + B + 0.5A + extraExtWallSteps/4
 *   Wall C high             = C
 *   Roof mono pitch         = A + 2B + 2.5C − 2
 *   Roof mono pitch edge    = 2
 *
 * Plus the user-controlled and overhead lines so the cost engine sees a
 * full build. Mirrors the fixed overhead/finishings amounts (all = 1) that
 * appear in every standard model quote.
 */
export function deriveAmounts(input: PlanAmountsInput): DerivedAmounts {
  if (input.typology !== "mono-pitch-4884") {
    // Phase 2b only supports the Mono Pitch formula path.
    // Other typologies follow the same pattern with different coefficients
    // (see J10–J17 rows in the calc template) and will be added per plan.
    throw new Error(
      `deriveAmounts: only 'mono-pitch-4884' is supported in Phase 2b (got '${input.typology}')`,
    );
  }

  const { A, B, C } = input.frames;
  const depthM = input.depthMm / 1000;
  const lengthM =
    (A * FRAME_A_MM + B * FRAME_B_MM + C * FRAME_C_MM) / 1000;

  // GFA from the frame combo (structural footprint). Excel B23 adds a small
  // wall-thickness adjustment; we approximate with the same 0.044 coefficient
  // applied to wall-frame counts summed below.
  const wallBLowAmt = B + 0.5 * A;
  const wallBHighAmt = 4 + B + 0.5 * A + input.extraExtWallSteps / 4;
  const wallCLowAmt = C;
  const wallCHighAmt = C;

  const gfaFromFrames = lengthM * depthM;
  const wallAdjustment =
    0.044 *
    (wallBLowAmt * 2.442 +
      wallCLowAmt * 3.053 +
      wallBHighAmt * 2.442 +
      wallCHighAmt * 3.053);
  const gfaSqm = input.gfaSqm ?? gfaFromFrames + wallAdjustment;

  // Exterior wall surface — mono-pitch low wall + high wall + two gable ends,
  // plus 0.61 m × eave height × extraExtWallSteps. Using Excel row 26 semantics.
  // For Phase 2b, approximate as outer perimeter × average wall height.
  const outerPerimeterM = 2 * (lengthM + depthM);
  const averageWallHeightM = 2.8; // approximate mid-height for Mono Pitch
  const extWallSqm =
    outerPerimeterM * averageWallHeightM +
    input.extraExtWallSteps * 0.61 * averageWallHeightM;
  const facadeSqm = Math.max(extWallSqm - input.aluminiumSqm, 0);

  // Roof surface — mono-pitch slope is small (5°); approximate with a flat
  // extension factor of 1.01. Excel row 30 uses a more precise trig formula.
  const roofSqm = lengthM * depthM * 1.01;

  // Painted surface — Excel row 124 = floor + decking + 2×extWall + partition + roof.
  // Decking defaults to 0; partition wall surface = partitions × 2.654 × 2 sides ≈ 6×partitionsM.
  const partitionWallSqm = input.partitionsM * 6;
  const paintableSqm =
    gfaSqm +
    0 +
    2 * extWallSqm +
    partitionWallSqm +
    roofSqm;

  const componentAmounts: ComponentAmounts = {
    // Frames (Mono Pitch only; other typologies would pick different roof rows)
    "floor-frame-2442x1221": 2 * A,
    "floor-frame-2442x2442": 2 * B,
    "floor-frame-2442x3053": 2 * C,
    "wall-frame-2442x2654": wallBLowAmt,
    "wall-frame-3053x2654": wallCLowAmt,
    "wall-frame-2442x2999": wallBHighAmt,
    "wall-frame-3053x2999": wallCHighAmt,
    "partition-wall-frame-per-m1": input.partitionsM,
    "facade-cladding-per-m2": facadeSqm,
    "roof-frame-mono-pitch": Math.max(A + 2 * B + 2.5 * C - 2, 0),
    "roof-frame-mono-pitch-edge": 2,

    // Aluminium (bulk)
    "aluminium-bulk-per-sqm": input.aluminiumSqm,

    // Building materials & works
    "foundation-point": 3 * (A + B + C + 1),
    "interior-door": input.interiorDoors,
    "roof-sheets-per-sqm": roofSqm,
    "paintworks-per-sqm": paintableSqm,
    "cement-boards-per-bathroom": input.bathrooms,
    "extra-timber": 1,
    "smoke-detector": 1,
    "fire-extinguisher": 1,

    // Project overhead (all fixed at 1)
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
  };

  return {
    componentAmounts,
    gfaSqm,
    paintableSqm,
    roofSqm,
    facadeSqm,
  };
}

/**
 * Whitelist of IDs produced by `deriveAmounts`, used by tests to catch typos.
 */
export const DERIVABLE_COMPONENT_IDS = [
  "floor-frame-2442x1221",
  "floor-frame-2442x2442",
  "floor-frame-2442x3053",
  "wall-frame-2442x2654",
  "wall-frame-3053x2654",
  "wall-frame-2442x2999",
  "wall-frame-3053x2999",
  "partition-wall-frame-per-m1",
  "facade-cladding-per-m2",
  "roof-frame-mono-pitch",
  "roof-frame-mono-pitch-edge",
  "aluminium-bulk-per-sqm",
  "foundation-point",
  "interior-door",
  "roof-sheets-per-sqm",
  "paintworks-per-sqm",
  "cement-boards-per-bathroom",
  "extra-timber",
  "smoke-detector",
  "fire-extinguisher",
  "easy-building-licence-fee",
  "design-fee-siteplan",
  "transport-materials-to-workshop",
  "transport-frames-to-site",
  "transport-foundation-to-site",
  "travel-costs-site-team",
  "accommodation-site-team",
  "workshop-costs",
  "unforeseen-costs",
  "vehicle-tool-maintenance",
  "project-management",
  "aftercare-warranty",
  "account-management",
  "customer-acquisition",
  "placement-labour",
  "cleaning-on-completion",
  "electricity",
  "plumbing",
] as const satisfies readonly ComponentId[];

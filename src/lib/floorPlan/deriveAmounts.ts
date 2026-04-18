import type { ComponentAmounts, TypologyId } from "@/types/costEngine";
import type { FrameCombo } from "@/lib/frameCombo";
import { deriveMonoPitchAmounts } from "./deriveMonoPitchAmounts";

/**
 * Inputs the client can vary per-plan. Mirrors Project Input cells
 * D27 (partitions), E28 (interior doors), E29 (aluminium), E30 (extra
 * exterior wall), E34 (bathrooms).
 *
 * Frame-combo shape so callers that already have `FrameCombo` (the
 * length slider / zone decomposer) can pass it straight in.
 */
export interface PlanAmountsInput {
  typology: TypologyId;
  frames: FrameCombo;
  partitionsM: number;
  interiorDoors: number;
  aluminiumSqm: number;
  extraExtWallSteps: number;
  bathrooms: number;
}

export interface DerivedAmounts {
  componentAmounts: ComponentAmounts;
  gfaSqm: number;
}

/**
 * Typology dispatcher — maps a frame-combo input to the per-typology
 * derive function. Today only Mono Pitch 4884 is wired; other
 * typologies plug into the `switch` below as their derive functions
 * land (compact gable, standard gable, clerestory, a-frame).
 *
 * Mono Pitch formulas live in `deriveMonoPitchAmounts.ts` and use the
 * precise Excel Structures-Database surface constants — the single
 * source of truth for amount derivation.
 */
export function deriveAmounts(input: PlanAmountsInput): DerivedAmounts {
  switch (input.typology) {
    case "mono-pitch-4884":
      return deriveMonoPitchAmounts({
        typology: input.typology,
        columnsA: input.frames.A,
        columnsB: input.frames.B,
        columnsC: input.frames.C,
        partitionsM: input.partitionsM,
        interiorDoors: input.interiorDoors,
        aluminiumSqm: input.aluminiumSqm,
        bathrooms: input.bathrooms,
        extraExtWallJumps: input.extraExtWallSteps,
      });
    default:
      throw new Error(
        `deriveAmounts: only 'mono-pitch-4884' is supported (got '${input.typology}')`,
      );
  }
}

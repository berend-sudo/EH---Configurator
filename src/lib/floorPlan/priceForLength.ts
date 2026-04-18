import { calculatePrice } from "@/lib/costEngine";
import type { CostBreakdown } from "@/types/costEngine";
import {
  deriveMonoPitchAmounts,
  type MonoPitchInputs,
} from "./deriveMonoPitchAmounts";

/** Structural lengths (mm) of each column type. */
const COLUMN_A_MM = 1221;
const COLUMN_B_MM = 2442;
const COLUMN_C_MM = 3053;

export interface LengthResolverInput {
  /** Base standard model this floor plan is derived from. */
  base: {
    columnsA: number;
    columnsB: number;
    columnsC: number;
    partitionsM: number;
    interiorDoors: number;
    aluminiumSqm: number;
    bathrooms: number;
    pergolaSqm?: number;
  };
  /** Structural length of the base config (1221·a + 2442·b + 3053·c). */
  baseLengthMm: number;
  /** Target structural length from the slider. */
  lengthMm: number;
  /** If true, partitions scale linearly with length. Default: true. */
  partitionsScaleWithLength?: boolean;
}

export interface LengthResolverResult {
  /** Cost breakdown (identical shape to `calculatePrice`'s output). */
  price: CostBreakdown;
  /** Fractional columns used to drive the derivation. */
  columns: { a: number; b: number; c: number };
  gfaSqm: number;
  inputs: MonoPitchInputs;
}

/**
 * Live price for a given target length.
 *
 * Strategy: absorb the length delta into *fractional* A-columns on top
 * of the base config, and feed that into `deriveMonoPitchAmounts`. Every
 * amount in the Excel formula chain is linear in (a, b, c), so fractional
 * columns produce correct linear cost scaling — cheap, smooth, and
 * correct-by-construction for the per-length items.
 *
 * Partitions scale linearly with length by default (Excel has no formula
 * for partitions-vs-length but the spec says partitions grow with GFA).
 * The user can switch this off for fixed-partition scenarios.
 */
export function priceForLength(input: LengthResolverInput): LengthResolverResult {
  const { base, baseLengthMm, lengthMm } = input;
  const partitionsScale = input.partitionsScaleWithLength ?? true;

  const deltaMm = lengthMm - baseLengthMm;
  const deltaA = deltaMm / COLUMN_A_MM;
  const columns = {
    a: base.columnsA + deltaA,
    b: base.columnsB,
    c: base.columnsC,
  };

  const partitionsM = partitionsScale
    ? baseLengthMm > 0
      ? (base.partitionsM * lengthMm) / baseLengthMm
      : base.partitionsM
    : base.partitionsM;

  const inputs: MonoPitchInputs = {
    typology: "mono-pitch-4884",
    columnsA: columns.a,
    columnsB: columns.b,
    columnsC: columns.c,
    partitionsM,
    interiorDoors: base.interiorDoors,
    aluminiumSqm: base.aluminiumSqm,
    bathrooms: base.bathrooms,
    pergolaSqm: base.pergolaSqm ?? 0,
  };

  const { gfaSqm, componentAmounts } = deriveMonoPitchAmounts(inputs);
  const price = calculatePrice({
    typology: "mono-pitch-4884",
    componentAmounts,
    gfaSqm,
  });

  return { price, columns, gfaSqm, inputs };
}

export { COLUMN_A_MM, COLUMN_B_MM, COLUMN_C_MM };

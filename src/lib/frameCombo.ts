import { FRAME_A_MM, FRAME_B_MM, FRAME_C_MM, JUMP_MM } from "./costEngine/constants";

/**
 * Frames in jump units (610 mm). Confirmed against
 * `260416 - Overview Typologies for Claude.xlsx`:
 *   A = 1,221 mm = 2 jumps
 *   B = 2,442 mm = 4 jumps
 *   C = 3,053 mm ≈ 5 jumps (nominal)
 */
export const JUMPS_PER_A = 2;
export const JUMPS_PER_B = 4;
export const JUMPS_PER_C = 5;

export interface FrameCombo {
  A: number;
  B: number;
  C: number;
}

/** Length in millimetres of a (A, B, C) combo (using nominal frame widths). */
export function frameComboLengthMm(combo: FrameCombo): number {
  return combo.A * FRAME_A_MM + combo.B * FRAME_B_MM + combo.C * FRAME_C_MM;
}

/** Length in jumps. */
export function frameComboJumps(combo: FrameCombo): number {
  return combo.A * JUMPS_PER_A + combo.B * JUMPS_PER_B + combo.C * JUMPS_PER_C;
}

/**
 * Decompose a jump count into an (A, B, C) combo, preferring the largest
 * frames first — matching the conventions of the standard models table in
 * the Excel:
 *
 *   Studio (8 jumps)   → 0A + 2B + 0C
 *   1BR Mono (10)      → 0A + 0B + 2C
 *   2BR Mono (14)      → 0A + 1B + 2C
 *   3BR Mono (15)      → 0A + 0B + 3C
 *
 * Throws if no integer decomposition exists for `jumps` (e.g. 7 jumps).
 */
export function decomposeJumps(jumps: number): FrameCombo {
  if (!Number.isFinite(jumps) || jumps < 0 || !Number.isInteger(jumps)) {
    throw new Error(`jumps must be a non-negative integer, got ${jumps}`);
  }
  for (let C = Math.floor(jumps / JUMPS_PER_C); C >= 0; C--) {
    const afterC = jumps - C * JUMPS_PER_C;
    for (let B = Math.floor(afterC / JUMPS_PER_B); B >= 0; B--) {
      const afterB = afterC - B * JUMPS_PER_B;
      if (afterB % JUMPS_PER_A === 0) {
        return { A: afterB / JUMPS_PER_A, B, C };
      }
    }
  }
  throw new Error(`No (A,B,C) decomposition for ${jumps} jumps`);
}

/** Snap a length in mm to the nearest valid jump boundary. */
export function snapToJumps(lengthMm: number): number {
  return Math.round(lengthMm / JUMP_MM) * JUMP_MM;
}

/** Length (mm) → jumps (integer), rounded. */
export function jumpsForLengthMm(lengthMm: number): number {
  return Math.round(lengthMm / JUMP_MM);
}

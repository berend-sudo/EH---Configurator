import { describe, expect, it } from "vitest";
import {
  decomposeJumps,
  frameComboJumps,
  frameComboLengthMm,
  jumpsForLengthMm,
  snapToJumps,
} from "@/lib/frameCombo";

describe("frame combo — Excel standard models", () => {
  it("Studio (8 jumps) → 0A + 2B + 0C", () => {
    expect(decomposeJumps(8)).toEqual({ A: 0, B: 2, C: 0 });
  });

  it("1BR Mono (10 jumps) → 0A + 0B + 2C", () => {
    expect(decomposeJumps(10)).toEqual({ A: 0, B: 0, C: 2 });
  });

  it("2BR Mono (14 jumps) → 0A + 1B + 2C", () => {
    expect(decomposeJumps(14)).toEqual({ A: 0, B: 1, C: 2 });
  });

  it("3BR Mono (15 jumps) → 0A + 0B + 3C", () => {
    expect(decomposeJumps(15)).toEqual({ A: 0, B: 0, C: 3 });
  });

  it("20 jumps (typology max) → 0A + 0B + 4C", () => {
    expect(decomposeJumps(20)).toEqual({ A: 0, B: 0, C: 4 });
  });
});

describe("frame combo — arithmetic", () => {
  it("frameComboLengthMm sums A×1221 + B×2442 + C×3053", () => {
    expect(frameComboLengthMm({ A: 2, B: 4, C: 0 })).toBe(
      2 * 1221 + 4 * 2442,
    );
    expect(frameComboLengthMm({ A: 0, B: 0, C: 2 })).toBe(6106);
    expect(frameComboLengthMm({ A: 0, B: 1, C: 2 })).toBe(8548);
  });

  it("frameComboJumps sums A×2 + B×4 + C×5", () => {
    expect(frameComboJumps({ A: 0, B: 0, C: 2 })).toBe(10);
    expect(frameComboJumps({ A: 2, B: 4, C: 0 })).toBe(20);
  });

  it("round-trips through decompose", () => {
    for (let n = 8; n <= 20; n++) {
      const combo = decomposeJumps(n);
      expect(frameComboJumps(combo)).toBe(n);
    }
  });

  it("snapToJumps rounds to the nearest 610 mm", () => {
    expect(snapToJumps(0)).toBe(0);
    expect(snapToJumps(610)).toBe(610);
    expect(snapToJumps(614)).toBe(610);
    expect(snapToJumps(6100)).toBe(6100);
    expect(snapToJumps(6404)).toBe(6100); // just below half-jump
    expect(snapToJumps(6406)).toBe(6710); // just above half-jump
  });

  it("jumpsForLengthMm rounds", () => {
    expect(jumpsForLengthMm(6106)).toBe(10);
    expect(jumpsForLengthMm(8548)).toBe(14);
  });
});

describe("frame combo — edge cases", () => {
  it("rejects non-integer jumps", () => {
    expect(() => decomposeJumps(10.5)).toThrow(/non-negative integer/);
  });

  it("rejects negative jumps", () => {
    expect(() => decomposeJumps(-1)).toThrow();
  });

  it("throws when no integer decomposition exists", () => {
    // 1 jump has no (A,B,C) solution: A needs 2, B needs 4, C needs 5.
    expect(() => decomposeJumps(1)).toThrow();
    expect(() => decomposeJumps(3)).toThrow();
  });

  it("finds valid decompositions for every jump count in [8, 20]", () => {
    for (let n = 8; n <= 20; n++) {
      expect(() => decomposeJumps(n)).not.toThrow();
    }
  });
});

import { describe, expect, it } from "vitest";
import {
  MONO_PITCH_1BR_DEFAULT,
  MONO_PITCH_2BR_DEFAULT,
  MONO_PITCH_2BR_STANDARD,
} from "@/data/standardModels";
import { calculatePrice } from "@/lib/costEngine";
import { priceForLength } from "@/lib/floorPlan/priceForLength";

describe("standard models — frame combos match the Excel table", () => {
  it("1BR Mono = 0A + 0B + 2C (Excel Project Costs F46:F48)", () => {
    expect(MONO_PITCH_1BR_DEFAULT.columnsA).toBe(0);
    expect(MONO_PITCH_1BR_DEFAULT.columnsB).toBe(0);
    expect(MONO_PITCH_1BR_DEFAULT.columnsC).toBe(2);
    expect(MONO_PITCH_1BR_DEFAULT.partitionsM).toBe(6);
    expect(MONO_PITCH_1BR_DEFAULT.interiorDoors).toBe(2);
    expect(MONO_PITCH_1BR_DEFAULT.aluminiumSqm).toBe(7.9);
    expect(MONO_PITCH_1BR_DEFAULT.bathrooms).toBe(1);
  });

  it("2BR Mono (standard) = 0A + 1B + 2C (Excel Project Costs G46:G48)", () => {
    expect(MONO_PITCH_2BR_STANDARD.columnsA).toBe(0);
    expect(MONO_PITCH_2BR_STANDARD.columnsB).toBe(1);
    expect(MONO_PITCH_2BR_STANDARD.columnsC).toBe(2);
  });

  it("2BR Mono (template default) = 2A + 4B + 0C", () => {
    expect(MONO_PITCH_2BR_DEFAULT.columnsA).toBe(2);
    expect(MONO_PITCH_2BR_DEFAULT.columnsB).toBe(4);
    expect(MONO_PITCH_2BR_DEFAULT.columnsC).toBe(0);
  });

  it("derived GFA for the template default matches Excel B23 exactly", () => {
    expect(MONO_PITCH_2BR_DEFAULT.gfaSqm).toBeCloseTo(61.137912, 5);
  });

  it("derived GFA for 2BR standard follows Excel B23 formula", () => {
    // 0A + 1B + 2C → floor-A = 0, floor-B = 2, floor-C = 4 (Excel L9/M9/N9 = 2·a/b/c)
    // floorSurface = 0 + 2×5.963364 + 4×7.455426 = 41.748432
    // wall-B-low = 1, wall-C-low = 2, wall-B-high = 5, wall-C-high = 2
    // wallLengthsM = 1·2.442 + 2·3.053 + 5·2.442 + 2·3.053 = 26.864
    // GFA = 41.748432 + 0.044·26.864 = 42.930448
    expect(MONO_PITCH_2BR_STANDARD.gfaSqm).toBeCloseTo(42.930448, 4);
  });
});

describe("priceForLength — live cost as slider moves", () => {
  const base = {
    columnsA: MONO_PITCH_2BR_STANDARD.columnsA,
    columnsB: MONO_PITCH_2BR_STANDARD.columnsB,
    columnsC: MONO_PITCH_2BR_STANDARD.columnsC,
    partitionsM: MONO_PITCH_2BR_STANDARD.partitionsM,
    interiorDoors: MONO_PITCH_2BR_STANDARD.interiorDoors,
    aluminiumSqm: MONO_PITCH_2BR_STANDARD.aluminiumSqm,
    bathrooms: MONO_PITCH_2BR_STANDARD.bathrooms,
  };
  const baseLengthMm = 8547; // 0A + 1B + 2C

  it("at base length matches the standard model price", () => {
    const baseline = calculatePrice({
      typology: "mono-pitch-4884",
      componentAmounts: MONO_PITCH_2BR_STANDARD.componentAmounts,
      gfaSqm: MONO_PITCH_2BR_STANDARD.gfaSqm,
    });
    const live = priceForLength({ base, baseLengthMm, lengthMm: baseLengthMm });
    expect(live.price.priceUgxIncVat).toBeCloseTo(baseline.priceUgxIncVat, 2);
    expect(live.gfaSqm).toBeCloseTo(MONO_PITCH_2BR_STANDARD.gfaSqm, 6);
  });

  it("price increases monotonically as length grows", () => {
    const prices = [baseLengthMm, 9157, 9767, 10377].map((L) =>
      priceForLength({ base, baseLengthMm, lengthMm: L }).price.priceUgxIncVat,
    );
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThan(prices[i - 1]);
    }
  });

  it("price decreases monotonically as length shrinks", () => {
    const prices = [baseLengthMm, 7937, 7327, 6717].map((L) =>
      priceForLength({ base, baseLengthMm, lengthMm: L }).price.priceUgxIncVat,
    );
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeLessThan(prices[i - 1]);
    }
  });

  it("GFA tracks length linearly (floor area scales with length)", () => {
    const r0 = priceForLength({ base, baseLengthMm, lengthMm: baseLengthMm });
    const r2442 = priceForLength({
      base,
      baseLengthMm,
      lengthMm: baseLengthMm + 2442,
    });
    // +2442 mm of length = +2 fractional A columns in the derivation.
    // Floor-A count grows by 4 → +4·2.981682 = 11.927 sqm, plus small
    // 0.044× wall-thickness contribution ≈ 0.215 sqm. Total ≈ 12.14 sqm.
    const delta = r2442.gfaSqm - r0.gfaSqm;
    expect(delta).toBeGreaterThan(12.0);
    expect(delta).toBeLessThan(12.3);
  });

  it("absorbs length delta into fractional A columns", () => {
    const r = priceForLength({
      base,
      baseLengthMm,
      lengthMm: baseLengthMm + 1221,
    });
    expect(r.columns.a).toBeCloseTo(base.columnsA + 1, 6);
    expect(r.columns.b).toBe(base.columnsB);
    expect(r.columns.c).toBe(base.columnsC);
  });
});

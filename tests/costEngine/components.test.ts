import { describe, expect, it } from "vitest";
import { COMPONENT_COSTS, USD_TO_UGX, getComponentCost } from "@/lib/costEngine";

describe("component cost table", () => {
  it("contains all expected sections (frames, aluminium, materials, overhead, finishings)", () => {
    // Sanity bounds — adding/removing a row should be a deliberate act.
    expect(COMPONENT_COSTS.length).toBeGreaterThanOrEqual(60);
    expect(COMPONENT_COSTS.length).toBeLessThanOrEqual(80);
  });

  it("has unique ids", () => {
    const ids = COMPONENT_COSTS.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("USD and UGX unit costs agree to within 0.5% (rate = 3700)", () => {
    for (const c of COMPONENT_COSTS) {
      const expectedUgx = c.usdUnit * USD_TO_UGX;
      const drift = Math.abs(c.ugxUnit - expectedUgx) / Math.max(expectedUgx, 1);
      expect(
        drift,
        `${c.id}: usd=${c.usdUnit} → expected ugx=${expectedUgx}, got ${c.ugxUnit}`,
      ).toBeLessThan(0.005);
    }
  });

  it("all unit costs are non-negative", () => {
    for (const c of COMPONENT_COSTS) {
      expect(c.usdUnit, c.id).toBeGreaterThanOrEqual(0);
      expect(c.ugxUnit, c.id).toBeGreaterThanOrEqual(0);
    }
  });

  it("only roof-sheets-per-sqm carries the Excel +150 fixed surcharge", () => {
    const withSurcharge = COMPONENT_COSTS.filter((c) => c.fixedExtraUsd);
    expect(withSurcharge.map((c) => c.id)).toEqual(["roof-sheets-per-sqm"]);
    expect(getComponentCost("roof-sheets-per-sqm").fixedExtraUsd).toBe(150);
  });

  describe("getComponentCost", () => {
    it("returns the matching row", () => {
      expect(getComponentCost("foundation-point").usdUnit).toBeCloseTo(43.3, 1);
    });

    it("throws for unknown ids", () => {
      expect(() =>
        // @ts-expect-error — intentional bad id
        getComponentCost("not-a-component"),
      ).toThrow(/Unknown component id/);
    });
  });
});

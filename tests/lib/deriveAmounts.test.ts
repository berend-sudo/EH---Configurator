import { describe, expect, it } from "vitest";
import { calculatePrice } from "@/lib/costEngine";
import { deriveAmounts } from "@/lib/floorPlan/deriveAmounts";

describe("deriveAmounts — Mono Pitch 4884 frame formulas", () => {
  it("reproduces the Funky Jackfruit inputs (2A + 4B + 0C) frame counts", () => {
    const { componentAmounts } = deriveAmounts({
      typology: "mono-pitch-4884",
      frames: { A: 2, B: 4, C: 0 },
      partitionsM: 27,
      interiorDoors: 6,
      aluminiumSqm: 10.5,
      extraExtWallSteps: 0,
      bathrooms: 2,
    });
    expect(componentAmounts["floor-frame-2442x1221"]).toBe(4);
    expect(componentAmounts["floor-frame-2442x2442"]).toBe(8);
    expect(componentAmounts["floor-frame-2442x3053"]).toBe(0);
    expect(componentAmounts["wall-frame-2442x2654"]).toBe(5);
    expect(componentAmounts["wall-frame-2442x2999"]).toBe(9);
    expect(componentAmounts["roof-frame-mono-pitch"]).toBe(8);
    expect(componentAmounts["roof-frame-mono-pitch-edge"]).toBe(2);
    expect(componentAmounts["foundation-point"]).toBe(21);
    expect(componentAmounts["partition-wall-frame-per-m1"]).toBe(27);
    expect(componentAmounts["interior-door"]).toBe(6);
    expect(componentAmounts["aluminium-bulk-per-sqm"]).toBe(10.5);
    expect(componentAmounts["cement-boards-per-bathroom"]).toBe(2);
  });

  it("1BR Mono (0A + 0B + 2C) derives the Excel-published amounts", () => {
    const { componentAmounts } = deriveAmounts({
      typology: "mono-pitch-4884",
      frames: { A: 0, B: 0, C: 2 },
      partitionsM: 6,
      interiorDoors: 2,
      aluminiumSqm: 7.9,
      extraExtWallSteps: 0,
      bathrooms: 1,
    });
    // Per Excel L9–V9 formulas:
    //   Floor C = 2×C = 4
    //   Foundation = 3×(0+0+2+1) = 9
    //   Wall B low = 0, Wall C low = 2
    //   Wall B high = 4 + 0 + 0 = 4, Wall C high = 2
    //   Roof mono = 0 + 0 + 2.5×2 − 2 = 3
    //   Roof edge = 2
    expect(componentAmounts["floor-frame-2442x3053"]).toBe(4);
    expect(componentAmounts["foundation-point"]).toBe(9);
    expect(componentAmounts["wall-frame-2442x2654"]).toBe(0);
    expect(componentAmounts["wall-frame-3053x2654"]).toBe(2);
    expect(componentAmounts["wall-frame-2442x2999"]).toBe(4);
    expect(componentAmounts["wall-frame-3053x2999"]).toBe(2);
    expect(componentAmounts["roof-frame-mono-pitch"]).toBe(3);
    expect(componentAmounts["roof-frame-mono-pitch-edge"]).toBe(2);
  });

  it("2BR Mono (0A + 1B + 2C) derives the Excel-published amounts", () => {
    const { componentAmounts, gfaSqm } = deriveAmounts({
      typology: "mono-pitch-4884",
      frames: { A: 0, B: 1, C: 2 },
      partitionsM: 12.5,
      interiorDoors: 3,
      aluminiumSqm: 10.2,
      extraExtWallSteps: 0,
      bathrooms: 1,
    });
    expect(componentAmounts["floor-frame-2442x2442"]).toBe(2);
    expect(componentAmounts["floor-frame-2442x3053"]).toBe(4);
    expect(componentAmounts["foundation-point"]).toBe(12);
    expect(componentAmounts["wall-frame-2442x2654"]).toBe(1);
    expect(componentAmounts["wall-frame-3053x2654"]).toBe(2);
    expect(componentAmounts["wall-frame-2442x2999"]).toBe(5);
    expect(componentAmounts["wall-frame-3053x2999"]).toBe(2);
    expect(componentAmounts["roof-frame-mono-pitch"]).toBe(5);
    // GFA ≈ length × depth ≈ 8.548 × 4.884 ≈ 41.7 sqm
    expect(gfaSqm).toBeGreaterThan(40);
    expect(gfaSqm).toBeLessThan(45);
  });

  it("extraExtWallSteps bumps only the Wall B high line (by steps/4)", () => {
    const base = deriveAmounts({
      typology: "mono-pitch-4884",
      frames: { A: 0, B: 1, C: 2 },
      partitionsM: 12.5,
      interiorDoors: 3,
      aluminiumSqm: 10.2,
      extraExtWallSteps: 0,
      bathrooms: 1,
    });
    const withSteps = deriveAmounts({
      typology: "mono-pitch-4884",
      frames: { A: 0, B: 1, C: 2 },
      partitionsM: 12.5,
      interiorDoors: 3,
      aluminiumSqm: 10.2,
      extraExtWallSteps: 4,
      bathrooms: 1,
    });
    expect(withSteps.componentAmounts["wall-frame-2442x2999"]).toBe(
      (base.componentAmounts["wall-frame-2442x2999"] ?? 0) + 1,
    );
  });

  it("produces a cost breakdown the engine can price (sane UGX totals)", () => {
    const derived = deriveAmounts({
      typology: "mono-pitch-4884",
      frames: { A: 0, B: 1, C: 2 },
      partitionsM: 12.5,
      interiorDoors: 3,
      aluminiumSqm: 10.2,
      extraExtWallSteps: 0,
      bathrooms: 1,
    });
    const result = calculatePrice({
      componentAmounts: derived.componentAmounts,
      gfaSqm: derived.gfaSqm,
    });
    // A 2BR Mono at base length should land somewhere in the tens of millions UGX.
    expect(result.priceUgxIncVat).toBeGreaterThan(50_000_000);
    expect(result.priceUgxIncVat).toBeLessThan(120_000_000);
  });

  it("larger homes cost more than smaller ones (monotonic in frames)", () => {
    const small = deriveAmounts({
      typology: "mono-pitch-4884",
      frames: { A: 0, B: 0, C: 2 },
      partitionsM: 6,
      interiorDoors: 2,
      aluminiumSqm: 7.9,
      extraExtWallSteps: 0,
      bathrooms: 1,
    });
    const big = deriveAmounts({
      typology: "mono-pitch-4884",
      frames: { A: 0, B: 0, C: 4 },
      partitionsM: 6,
      interiorDoors: 2,
      aluminiumSqm: 7.9,
      extraExtWallSteps: 0,
      bathrooms: 1,
    });
    const priceSmall = calculatePrice({
      componentAmounts: small.componentAmounts,
      gfaSqm: small.gfaSqm,
    }).priceUgxIncVat;
    const priceBig = calculatePrice({
      componentAmounts: big.componentAmounts,
      gfaSqm: big.gfaSqm,
    }).priceUgxIncVat;
    expect(priceBig).toBeGreaterThan(priceSmall);
  });

  it("throws for unsupported typologies (Phase 2b limitation)", () => {
    expect(() =>
      deriveAmounts({
        typology: "compact-gable-6106",
        frames: { A: 0, B: 4, C: 0 },
        partitionsM: 22,
        interiorDoors: 4,
        aluminiumSqm: 18.5,
        extraExtWallSteps: 2,
        bathrooms: 2,
      }),
    ).toThrow(/only 'mono-pitch-4884'/);
  });
});

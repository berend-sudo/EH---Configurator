import { describe, expect, it } from "vitest";
import { calculatePrice } from "@/lib/costEngine";
import { MONO_PITCH_2BR_DEFAULT } from "@/data/standardModels";

/**
 * Calibration test against the "Project Costs" sheet of
 * "Copy Berend of Easy Housing - Calculation Template 2026.xlsx"
 * with the default input values (Mono Pitch 4884, 2A + 4B + 0C, 27m1
 * partitions, 6 interior doors, 10.5 sqm aluminium, 2BR / 2 bath).
 *
 * Expected reference cell values:
 *   B23  GFA                        61.137912 sqm
 *   B41  Cost USD ex VAT            20,866.88
 *   B42  Margin USD                  2,086.69
 *   B44  Sales price USD ex VAT     22,953.57
 *   B45  Price USD inc VAT          27,085.21
 *   B48  Price UGX ex VAT       77,207,468  (cost × 3700, rounded)
 *   B49  Margin UGX              7,720,747
 *   B50  VAT UGX                15,287,079
 *   B51  Price UGX inc VAT     100,215,294  (≈ "100.2M" target)
 */
describe("cost engine — default Mono Pitch 2BR (template default)", () => {
  const result = calculatePrice({
    typology: MONO_PITCH_2BR_DEFAULT.typology,
    componentAmounts: MONO_PITCH_2BR_DEFAULT.componentAmounts,
    gfaSqm: MONO_PITCH_2BR_DEFAULT.gfaSqm,
  });

  it("matches Excel cost USD ex VAT (B41 ≈ 20,866.88)", () => {
    expect(result.costUsdExVat).toBeCloseTo(20866.88, 1);
  });

  it("applies 10% margin in USD (B42 ≈ 2,086.69)", () => {
    expect(result.marginUsd).toBeCloseTo(2086.69, 1);
  });

  it("computes sales price USD ex VAT (B44 ≈ 22,953.57)", () => {
    expect(result.salesPriceUsdExVat).toBeCloseTo(22953.57, 1);
  });

  it("computes price USD inc VAT (B45 ≈ 27,085.21)", () => {
    expect(result.priceUsdIncVat).toBeCloseTo(27085.21, 1);
  });

  it("computes cost UGX rounded (B48 = 77,207,468)", () => {
    expect(result.costUgxRounded).toBe(77_207_468);
  });

  it("computes margin UGX (B49 ≈ 7,720,747)", () => {
    expect(result.marginUgx).toBeCloseTo(7_720_746.8, 0);
  });

  it("computes VAT UGX (B50 ≈ 15,287,079)", () => {
    expect(result.vatUgx).toBeCloseTo(15_287_078.66, 0);
  });

  it("computes price UGX inc VAT (B51 ≈ 100,215,294 — the headline number)", () => {
    expect(result.priceUgxIncVat).toBeGreaterThan(100_100_000);
    expect(result.priceUgxIncVat).toBeLessThan(100_300_000);
    expect(result.priceUgxIncVat).toBeCloseTo(100_215_294, -2);
  });

  it("rounds UP to the next 100,000 UGX for client display", () => {
    expect(result.priceUgxIncVatRounded % 100_000).toBe(0);
    expect(result.priceUgxIncVatRounded).toBeGreaterThanOrEqual(
      result.priceUgxIncVat,
    );
    expect(result.priceUgxIncVatRounded - result.priceUgxIncVat).toBeLessThan(
      100_000,
    );
  });

  it("returns the GFA we passed in", () => {
    expect(result.gfaSqm).toBeCloseTo(61.137912, 5);
  });

  it("computes price per sqm UGX inc VAT (≈ 1,639,168)", () => {
    expect(result.pricePerSqmUgxIncVat).toBeCloseTo(1_639_168, -2);
  });

  it("emits a non-empty component breakdown that sums to costUsdExVat", () => {
    const sum = result.componentBreakdown.reduce(
      (acc, line) => acc + line.totalUsd,
      0,
    );
    expect(result.componentBreakdown.length).toBeGreaterThan(20);
    expect(sum).toBeCloseTo(result.costUsdExVat, 4);
  });
});

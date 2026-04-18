import { describe, expect, it } from "vitest";
import {
  gfaForPlanAtLength,
  scaleAmountsToLength,
} from "@/lib/floorPlan/costForLength";
import { MONO_PITCH_2BR_FLOOR_PLAN } from "@/data/floorPlans/monoPitch2BR";
import { MONO_PITCH_2BR_DEFAULT } from "@/data/standardModels";

describe("costForLength", () => {
  const plan = MONO_PITCH_2BR_FLOOR_PLAN;

  it("leaves amounts untouched at baseLength = targetLength", () => {
    const out = scaleAmountsToLength(
      MONO_PITCH_2BR_DEFAULT.componentAmounts,
      10000,
      10000,
    );
    expect(out).toEqual(MONO_PITCH_2BR_DEFAULT.componentAmounts);
  });

  it("scales floor-frame counts with length ratio", () => {
    const base = MONO_PITCH_2BR_DEFAULT.componentAmounts;
    const out = scaleAmountsToLength(base, 10000, 5000);
    expect(out["floor-frame-2442x2442"]).toBe((base["floor-frame-2442x2442"] ?? 0) * 0.5);
  });

  it("keeps fixed overhead components constant", () => {
    const base = MONO_PITCH_2BR_DEFAULT.componentAmounts;
    const out = scaleAmountsToLength(base, 10000, 20000);
    expect(out["interior-door"]).toBe(base["interior-door"]);
    expect(out["smoke-detector"]).toBe(base["smoke-detector"]);
    expect(out["easy-building-licence-fee"]).toBe(
      base["easy-building-licence-fee"],
    );
  });

  it("gfaForPlanAtLength returns depth × length in sqm", () => {
    const gfa = gfaForPlanAtLength(plan, plan.baseLengthMm);
    expect(gfa).toBeCloseTo((plan.depthMm * plan.baseLengthMm) / 1_000_000, 3);
  });
});

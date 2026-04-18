import { describe, expect, it } from "vitest";
import { MONO_PITCH_2BR_FLOOR_PLAN } from "@/data/floorPlans/monoPitch2BR";
import { stretchFloorPlan } from "@/lib/floorPlan/stretch";

describe("stretchFloorPlan", () => {
  const plan = MONO_PITCH_2BR_FLOOR_PLAN;

  it("is an identity at baseLengthMm", () => {
    const { model, zoneLayouts } = stretchFloorPlan(plan, plan.baseLengthMm);
    expect(model.viewBox.width).toBe(plan.viewBox.width);
    for (const l of zoneLayouts) {
      expect(l.newXStart).toBeCloseTo(l.origXStart, 1);
      expect(l.newXEnd).toBeCloseTo(l.origXEnd, 1);
      expect(l.newWidth).toBeCloseTo(l.origWidth, 1);
    }
  });

  it("grows the outer viewBox width by the length delta", () => {
    const target = plan.baseLengthMm + 2 * plan.jumpSizeMm; // + 1220 mm
    const { model } = stretchFloorPlan(plan, target);
    expect(model.viewBox.width).toBe(plan.viewBox.width + 1220);
  });

  it("shrinks when asked to go below base length", () => {
    const target = plan.baseLengthMm - plan.jumpSizeMm; // - 610 mm
    const { model } = stretchFloorPlan(plan, target);
    expect(model.viewBox.width).toBe(plan.viewBox.width - 610);
  });

  it("absorbs growth into the living zone first (order=1)", () => {
    const target = plan.baseLengthMm + 1000;
    const { zoneLayouts } = stretchFloorPlan(plan, target);
    const living = zoneLayouts.find((z) => z.id === "zone-living")!;
    const bedrooms = zoneLayouts.find((z) => z.id === "zone-bedrooms")!;
    const wet = zoneLayouts.find((z) => z.id === "zone-wet-core")!;
    expect(living.newWidth - living.origWidth).toBeGreaterThan(0);
    expect(bedrooms.newWidth - bedrooms.origWidth).toBeCloseTo(0, 1);
    expect(wet.newWidth - wet.origWidth).toBeCloseTo(0, 1);
  });

  it("respects zone maxWidth — overflow spills into the next zone", () => {
    const living = plan.zones.find((z) => z.id === "zone-living")!;
    const overshoot = living.maxWidthMm - (living.xEndMm - living.xStartMm) + 500;
    const target = plan.baseLengthMm + overshoot;
    const { zoneLayouts } = stretchFloorPlan(plan, target);
    const livingLay = zoneLayouts.find((z) => z.id === "zone-living")!;
    const bedroomsLay = zoneLayouts.find((z) => z.id === "zone-bedrooms")!;
    expect(livingLay.newWidth).toBeLessThanOrEqual(living.maxWidthMm + 0.5);
    expect(bedroomsLay.newWidth).toBeGreaterThan(
      bedroomsLay.origWidth - 0.5,
    );
  });

  it("keeps zones spatially contiguous (no gaps, no overlaps)", () => {
    const { zoneLayouts } = stretchFloorPlan(plan, plan.baseLengthMm + 1800);
    const sorted = [...zoneLayouts].sort((a, b) => a.newXStart - b.newXStart);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].newXStart).toBeCloseTo(sorted[i - 1].newXEnd, 1);
    }
  });

  it("updates the overall-width dimension label", () => {
    const target = plan.baseLengthMm + plan.jumpSizeMm;
    const { model } = stretchFloorPlan(plan, target);
    const dim = model.elements.find((e) => e.id === "dim-overall-width");
    expect(dim).toBeDefined();
    if (dim && dim.type === "dimension") {
      expect(dim.label).toContain(",");
      // 9,245 = 8635 + 610
      expect(dim.label.replace(/,/g, "")).toBe(String(target + (plan.viewBox.width - plan.baseLengthMm)));
    }
  });
});

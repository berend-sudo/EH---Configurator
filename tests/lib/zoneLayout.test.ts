import { describe, expect, it } from "vitest";
import { layoutZones, zoneLayoutById } from "@/lib/floorPlan/zoneLayout";
import { MONO_PITCH_2BR_FLOOR_PLAN } from "@/data/floorPlans/monoPitch2BR";

const plan = MONO_PITCH_2BR_FLOOR_PLAN;

describe("zoneLayout — at base length", () => {
  it("returns the authored widths unchanged", () => {
    const layout = layoutZones(plan, { targetLengthMm: plan.viewBox.width });
    const sum = layout.zones.reduce((a, z) => a + z.widthMm, 0);
    expect(sum).toBe(plan.viewBox.width);
    for (const zl of layout.zones) {
      expect(zl.widthMm).toBe(zl.baseWidthMm);
      expect(zl.xShiftMm).toBe(zl.xStartMm - zl.baseXStartMm);
    }
  });

  it("exposes min/max capacity", () => {
    const layout = layoutZones(plan, { targetLengthMm: 0 });
    const expectedMin = plan.zones.reduce((a, z) => a + z.minWidthMm, 0);
    const expectedMax = plan.zones.reduce((a, z) => a + z.maxWidthMm, 0);
    expect(layout.minLengthMm).toBe(expectedMin);
    expect(layout.maxLengthMm).toBe(expectedMax);
  });
});

describe("zoneLayout — growing", () => {
  it("fills the lowest-order zone first", () => {
    const living = plan.zones.find((z) => z.id === "zone-living")!;
    const livingHeadroom = living.maxWidthMm - (living.xEndMm - living.xStartMm);
    const target = plan.viewBox.width + livingHeadroom - 100; // just under max
    const layout = layoutZones(plan, { targetLengthMm: target });

    const livingLayout = zoneLayoutById(layout, "zone-living")!;
    const bedroomsLayout = zoneLayoutById(layout, "zone-bedrooms")!;
    const wetLayout = zoneLayoutById(layout, "zone-wet-core")!;

    expect(livingLayout.widthMm).toBeGreaterThan(livingLayout.baseWidthMm);
    expect(bedroomsLayout.widthMm).toBe(bedroomsLayout.baseWidthMm);
    expect(wetLayout.widthMm).toBe(wetLayout.baseWidthMm);
    expect(layout.totalLengthMm).toBe(target);
  });

  it("overflows to the next priority zone when first is maxed", () => {
    const living = plan.zones.find((z) => z.id === "zone-living")!;
    const bedrooms = plan.zones.find((z) => z.id === "zone-bedrooms")!;
    const livingMax = living.maxWidthMm;
    const bedroomsBase = bedrooms.xEndMm - bedrooms.xStartMm;
    const livingBase = living.xEndMm - living.xStartMm;

    // Max out living + add 400 mm more — should land in bedrooms.
    const target = plan.viewBox.width + (livingMax - livingBase) + 400;
    const layout = layoutZones(plan, { targetLengthMm: target });

    expect(zoneLayoutById(layout, "zone-living")!.widthMm).toBe(livingMax);
    expect(zoneLayoutById(layout, "zone-bedrooms")!.widthMm).toBe(
      bedroomsBase + 400,
    );
  });

  it("clamps to the max capacity", () => {
    const layout = layoutZones(plan, { targetLengthMm: 999_999 });
    expect(layout.totalLengthMm).toBe(layout.maxLengthMm);
    for (const zl of layout.zones) {
      const z = plan.zones.find((zz) => zz.id === zl.id)!;
      expect(zl.widthMm).toBe(z.maxWidthMm);
    }
  });
});

describe("zoneLayout — shrinking", () => {
  it("yields the highest-order zone first", () => {
    const wet = plan.zones.find((z) => z.id === "zone-wet-core")!;
    const wetBase = wet.xEndMm - wet.xStartMm;
    const shrinkBy = (wetBase - wet.minWidthMm) - 50;
    const target = plan.viewBox.width - shrinkBy;
    const layout = layoutZones(plan, { targetLengthMm: target });

    expect(zoneLayoutById(layout, "zone-wet-core")!.widthMm).toBe(
      wetBase - shrinkBy,
    );
    expect(zoneLayoutById(layout, "zone-bedrooms")!.widthMm).toBe(
      plan.zones.find((z) => z.id === "zone-bedrooms")!.xEndMm -
        plan.zones.find((z) => z.id === "zone-bedrooms")!.xStartMm,
    );
  });

  it("clamps to the min capacity", () => {
    const layout = layoutZones(plan, { targetLengthMm: 0 });
    expect(layout.totalLengthMm).toBe(layout.minLengthMm);
    for (const zl of layout.zones) {
      const z = plan.zones.find((zz) => zz.id === zl.id)!;
      expect(zl.widthMm).toBe(z.minWidthMm);
    }
  });
});

describe("zoneLayout — geometry", () => {
  it("zones tile the length with no gaps or overlap", () => {
    const layout = layoutZones(plan, { targetLengthMm: plan.viewBox.width + 500 });
    expect(layout.zones[0].xStartMm).toBe(0);
    for (let i = 1; i < layout.zones.length; i++) {
      expect(layout.zones[i].xStartMm).toBe(layout.zones[i - 1].xEndMm);
    }
  });

  it("zones are returned in left-to-right order", () => {
    const layout = layoutZones(plan, { targetLengthMm: plan.viewBox.width });
    for (let i = 1; i < layout.zones.length; i++) {
      expect(layout.zones[i].baseXStartMm).toBeGreaterThan(
        layout.zones[i - 1].baseXStartMm,
      );
    }
  });
});

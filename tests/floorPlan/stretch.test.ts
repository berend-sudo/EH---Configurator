import { describe, expect, it } from "vitest";
import { MONO_PITCH_2BR_FLOOR_PLAN } from "@/data/floorPlans/monoPitch2BR";
import {
  snapLength,
  stretchFloorPlan,
} from "@/lib/floorPlan/stretch";
import type { WallElement } from "@/types/floorPlan";

const plan = MONO_PITCH_2BR_FLOOR_PLAN;
// Base 8547 isn't on the 610 mm grid → snaps to 8540 (14 jumps).
const BASE_SNAPPED = snapLength(plan, plan.baseLengthMm);

describe("snapLength", () => {
  it("rounds to the nearest jump", () => {
    expect(snapLength(plan, 8500)).toBe(8540); // 13.93 → 14
    expect(snapLength(plan, 8547)).toBe(8540); // 14.011 → 14
    expect(snapLength(plan, 8540)).toBe(8540);
  });

  it("clamps to the typology min/max", () => {
    expect(snapLength(plan, 0)).toBe(plan.minLengthMm);
    expect(snapLength(plan, 999999)).toBe(plan.maxLengthMm);
  });
});

describe("stretchFloorPlan", () => {
  it("at base length snaps to the 610 mm grid", () => {
    const stretched = stretchFloorPlan(plan, plan.baseLengthMm);
    expect(stretched.lengthMm).toBe(BASE_SNAPPED);
    expect(stretched.zones).toHaveLength(plan.zones.length);
  });

  it("grows the highest-priority zone first (living room)", () => {
    // Two jumps more than the snapped base.
    const stretched = stretchFloorPlan(plan, BASE_SNAPPED + 2 * 610);
    const living = stretched.zones.find((z) => z.id === "zone-living")!;
    const bedrooms = stretched.zones.find((z) => z.id === "zone-bedrooms")!;
    const wetcore = stretched.zones.find((z) => z.id === "zone-wet-core")!;
    const deltaVsAuthoredBase = stretched.lengthMm - plan.baseLengthMm;
    // Living zone should absorb every mm of growth.
    expect(living.widthNewMm - living.widthBaseMm).toBeCloseTo(
      deltaVsAuthoredBase,
      1,
    );
    expect(bedrooms.widthNewMm).toBeCloseTo(bedrooms.widthBaseMm, 6);
    expect(wetcore.widthNewMm).toBeCloseTo(wetcore.widthBaseMm, 6);
  });

  it("caps each zone at maxWidth and spills to the next priority", () => {
    const stretched = stretchFloorPlan(plan, plan.maxLengthMm);
    for (const z of stretched.zones) {
      expect(z.widthNewMm).toBeLessThanOrEqual(z.maxWidthMm + 1);
    }
  });

  it("shrinks from the lowest-priority zone first", () => {
    // One jump smaller — fully absorbed by wet-core (slack ~988 mm).
    const stretched = stretchFloorPlan(plan, BASE_SNAPPED - 610);
    const living = stretched.zones.find((z) => z.id === "zone-living")!;
    const bedrooms = stretched.zones.find((z) => z.id === "zone-bedrooms")!;
    const wetcore = stretched.zones.find((z) => z.id === "zone-wet-core")!;
    expect(wetcore.widthNewMm).toBeLessThan(wetcore.widthBaseMm);
    expect(bedrooms.widthNewMm).toBeCloseTo(bedrooms.widthBaseMm, 6);
    expect(living.widthNewMm).toBeCloseTo(living.widthBaseMm, 6);
  });

  it("moves the external wall's right edge to the new outer width", () => {
    const stretched = stretchFloorPlan(plan, BASE_SNAPPED + 2 * 610);
    const ext = stretched.elements.find(
      (e): e is WallElement => e.type === "wall" && e.id === "wall-external",
    )!;
    const maxX = Math.max(...ext.points.map(([x]) => x));
    expect(maxX).toBeCloseTo(stretched.outerWidthMm, 3);
  });

  it("preserves element counts and ids", () => {
    const stretched = stretchFloorPlan(plan, BASE_SNAPPED + 2 * 610);
    expect(stretched.elements).toHaveLength(plan.elements.length);
    const originalIds = plan.elements.map((e) => e.id).sort();
    const stretchedIds = stretched.elements.map((e) => e.id).sort();
    expect(stretchedIds).toEqual(originalIds);
  });

  it("rewrites numeric dimension labels to match the new distance", () => {
    const stretched = stretchFloorPlan(plan, BASE_SNAPPED + 2 * 610);
    const overall = stretched.elements.find(
      (e) => e.type === "dimension" && e.id === "dim-overall-width",
    );
    if (!overall || overall.type !== "dimension") throw new Error("not found");
    expect(overall.label).toBe(stretched.outerWidthMm.toLocaleString("en-US"));
  });
});

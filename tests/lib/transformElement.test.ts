import { describe, expect, it } from "vitest";
import { transformElement } from "@/lib/floorPlan/transformElement";
import { layoutZones } from "@/lib/floorPlan/zoneLayout";
import { MONO_PITCH_2BR_FLOOR_PLAN } from "@/data/floorPlans/monoPitch2BR";
import type { FurnitureElement, RoomFillElement, WallElement } from "@/types/floorPlan";

const plan = MONO_PITCH_2BR_FLOOR_PLAN;

describe("transformElement — at base length (identity)", () => {
  const layout = layoutZones(plan, { targetLengthMm: plan.viewBox.width });

  it("returns external wall unchanged (no zoneId)", () => {
    const ext = plan.elements.find((e) => e.id === "wall-external") as WallElement;
    const out = transformElement(ext, layout) as WallElement;
    expect(out.points).toEqual(ext.points);
  });

  it("preserves x for zone-bound elements when layout == base", () => {
    const fill = plan.elements.find((e) => e.id === "fill-living") as RoomFillElement;
    const out = transformElement(fill, layout) as RoomFillElement;
    for (let i = 0; i < fill.points.length; i++) {
      expect(out.points[i][0]).toBeCloseTo(fill.points[i][0], 5);
      expect(out.points[i][1]).toBe(fill.points[i][1]);
    }
  });
});

describe("transformElement — growing the living zone", () => {
  const longer = plan.viewBox.width + 800; // grow by 800 mm (all into living)
  const layout = layoutZones(plan, { targetLengthMm: longer });

  it("stretches a room fill inside the stretched zone", () => {
    const fill = plan.elements.find((e) => e.id === "fill-living") as RoomFillElement;
    const out = transformElement(fill, layout) as RoomFillElement;
    // The fill's right side should have moved right by 800 mm.
    const origMaxX = Math.max(...fill.points.map((p) => p[0]));
    const newMaxX = Math.max(...out.points.map((p) => p[0]));
    expect(newMaxX - origMaxX).toBeGreaterThan(700);
  });

  it("shifts furniture without changing its width", () => {
    const sofa = plan.elements.find((e) => e.id === "f-sofa") as FurnitureElement;
    const out = transformElement(sofa, layout) as FurnitureElement;
    expect(out.widthMm).toBe(sofa.widthMm);
    expect(out.heightMm).toBe(sofa.heightMm);
    // Living zone shifts by 0 (its xStart stays 0 since it's the rightmost zone),
    // so the sofa's left anchor should stay the same in this scenario.
    // (Only the right boundary moves, which is handled by stretching the fill.)
    expect(out.xMm).toBeCloseTo(sofa.xMm, 3);
  });

  it("leaves zones earlier on the length axis untouched", () => {
    const fill = plan.elements.find((e) => e.id === "fill-bathroom") as RoomFillElement;
    const out = transformElement(fill, layout) as RoomFillElement;
    expect(out.points).toEqual(fill.points);
  });
});

describe("transformElement — growing past living max spills into bedrooms", () => {
  const living = plan.zones.find((z) => z.id === "zone-living")!;
  const livingBase = living.xEndMm - living.xStartMm;
  const livingHeadroom = living.maxWidthMm - livingBase;
  const grow = livingHeadroom + 500;
  const target = plan.viewBox.width + grow;
  const layout = layoutZones(plan, { targetLengthMm: target });

  it("shifts downstream zones (living) to the right by the bedroom growth", () => {
    const livingFill = plan.elements.find((e) => e.id === "fill-living") as RoomFillElement;
    const out = transformElement(livingFill, layout) as RoomFillElement;
    const origLeftX = Math.min(...livingFill.points.map((p) => p[0]));
    const newLeftX = Math.min(...out.points.map((p) => p[0]));
    // Bedrooms zone grew by 500 mm past living's max headroom, pushing
    // living's left edge right by ~500 mm (± the 88 mm partition-wall
    // offset between the fill's authored left edge and the zone boundary).
    const shift = newLeftX - origLeftX;
    expect(shift).toBeGreaterThan(400);
    expect(shift).toBeLessThan(600);
  });
});

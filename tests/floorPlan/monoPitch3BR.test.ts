import { describe, expect, it } from "vitest";
import { MONO_PITCH_3BR_FLOOR_PLAN } from "@/data/floorPlans/monoPitch3BR";
import type { FloorPlanElement } from "@/types/floorPlan";
import { layoutZones } from "@/lib/floorPlan/zoneLayout";

describe("3BR Mono Pitch floor plan", () => {
  const plan = MONO_PITCH_3BR_FLOOR_PLAN;

  it("matches the Mono Pitch 4884 typology depth", () => {
    expect(plan.typology).toBe("mono-pitch-4884");
    expect(plan.depthMm).toBe(4884);
  });

  it("uses the standard 3BR frame combo (3C, length 9159 mm)", () => {
    // 3 × 3053 = 9159 mm structural length
    expect(plan.baseLengthMm).toBe(9159);
    expect(plan.bedrooms).toBe(3);
    expect(plan.bathrooms).toBe(1);
  });

  it("has length bounds aligned to 8–20 jumps of 610 mm", () => {
    expect(plan.jumpSizeMm).toBe(610);
    expect(plan.minLengthMm).toBe(8 * 610);
    expect(plan.maxLengthMm).toBe(20 * 610);
  });

  it("has exactly one external wall element", () => {
    const ext = plan.elements.filter(
      (e) => e.type === "wall" && e.id === "wall-external",
    );
    expect(ext).toHaveLength(1);
  });

  it("has at least one element of every major kind", () => {
    const kinds = new Set(plan.elements.map((e) => e.type));
    for (const kind of [
      "wall",
      "partition",
      "room-fill",
      "door",
      "window",
      "furniture",
      "room-label",
      "dimension",
    ]) {
      expect(kinds, `missing ${kind}`).toContain(kind);
    }
  });

  it("labels all required rooms", () => {
    const labels = plan.elements
      .filter((e): e is FloorPlanElement & { type: "room-label" } =>
        e.type === "room-label",
      )
      .map((e) => e.label);
    for (const expected of [
      "Bathroom",
      "Bedroom 1",
      "Bedroom 2",
      "Bedroom 3",
      "Living Room",
      "Veranda",
    ]) {
      expect(labels).toContain(expected);
    }
  });

  it("declares 3 zones covering the length axis without overlap", () => {
    expect(plan.zones).toHaveLength(3);
    const sorted = [...plan.zones].sort((a, b) => a.xStartMm - b.xStartMm);
    expect(sorted[0].xStartMm).toBe(0);
    expect(sorted[sorted.length - 1].xEndMm).toBeGreaterThanOrEqual(
      plan.baseLengthMm,
    );
    for (let i = 1; i < sorted.length; i++) {
      expect(
        sorted[i].xStartMm,
        `zone ${sorted[i].id} must start where previous ends`,
      ).toBe(sorted[i - 1].xEndMm);
    }
  });

  it("assigns a valid zoneId to every non-structural element", () => {
    const zoneIds = new Set(plan.zones.map((z) => z.id));
    for (const el of plan.elements) {
      // external wall & overall dimensions live outside any zone.
      if (el.type === "wall" && el.id === "wall-external") continue;
      if (el.type === "dimension") continue;
      expect(el.zoneId, `${el.id} has no zoneId`).toBeDefined();
      expect(zoneIds, `${el.id} references unknown zone ${el.zoneId}`).toContain(
        el.zoneId!,
      );
    }
  });

  it("has unique element ids", () => {
    const ids = plan.elements.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("declares 4 interior doors + 1 entrance (3BR / 1 bath)", () => {
    const doors = plan.elements.filter((e) => e.type === "door");
    expect(doors).toHaveLength(5);
    expect(doors.map((d) => d.id)).toContain("door-entrance");
  });

  it("populates moving / stretching element lists with real ids", () => {
    const ids = new Set(plan.elements.map((e) => e.id));
    for (const zone of plan.zones) {
      for (const id of zone.movingElementIds) {
        expect(ids, `unknown moving element ${id}`).toContain(id);
      }
      for (const id of zone.stretchingElementIds) {
        expect(ids, `unknown stretching element ${id}`).toContain(id);
      }
    }
  });

  it("keeps every element inside the viewBox", () => {
    const { width, height } = plan.viewBox;
    for (const el of plan.elements) {
      for (const [x, y] of pointsOf(el)) {
        expect(x, `${el.id} x out of bounds`).toBeGreaterThanOrEqual(0);
        expect(x, `${el.id} x out of bounds`).toBeLessThanOrEqual(width);
        expect(y, `${el.id} y out of bounds`).toBeGreaterThanOrEqual(0);
        expect(y, `${el.id} y out of bounds`).toBeLessThanOrEqual(height);
      }
    }
  });

  it("centre zone fills first when stretching past base length", () => {
    const base = layoutZones(plan, { targetLengthMm: plan.viewBox.width });
    const stretched = layoutZones(plan, {
      targetLengthMm: plan.viewBox.width + 1220, // two jumps bigger
    });

    const baseCentre = base.zones.find((z) => z.id === "zone-centre")!;
    const stretchedCentre = stretched.zones.find(
      (z) => z.id === "zone-centre",
    )!;
    const baseRight = base.zones.find((z) => z.id === "zone-right-bedrooms")!;
    const stretchedRight = stretched.zones.find(
      (z) => z.id === "zone-right-bedrooms",
    )!;

    expect(stretchedCentre.widthMm).toBeGreaterThan(baseCentre.widthMm);
    // Centre has lots of headroom, so the right zone should stay at base width.
    expect(stretchedRight.widthMm).toBe(baseRight.widthMm);
  });

  it("supports enough zone capacity to span a reasonable slider range", () => {
    const dryRun = layoutZones(plan, { targetLengthMm: 0 });
    // Plan should accommodate the base outer length exactly.
    expect(dryRun.minLengthMm).toBeLessThanOrEqual(plan.viewBox.width);
    expect(dryRun.maxLengthMm).toBeGreaterThanOrEqual(plan.viewBox.width);
  });
});

function pointsOf(
  el: FloorPlanElement,
): ReadonlyArray<readonly [number, number]> {
  switch (el.type) {
    case "wall":
    case "partition":
    case "room-fill":
    case "terrace":
      return el.points;
    case "window":
      return el.points;
    case "door":
      return [[el.hingeXMm, el.hingeYMm]];
    case "furniture":
      return [
        [el.xMm, el.yMm],
        [el.xMm + el.widthMm, el.yMm + el.heightMm],
      ];
    case "room-label":
      return [[el.xMm, el.yMm]];
    case "dimension":
      return [el.from, el.to];
  }
}

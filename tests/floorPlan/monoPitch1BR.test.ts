import { describe, expect, it } from "vitest";
import { MONO_PITCH_1BR_FLOOR_PLAN } from "@/data/floorPlans/monoPitch1BR";
import { layoutZones } from "@/lib/floorPlan/zoneLayout";
import {
  decomposeJumps,
  jumpsForLengthMm,
} from "@/lib/frameCombo";
import type { FloorPlanElement } from "@/types/floorPlan";

describe("1BR Mono Pitch floor plan", () => {
  const plan = MONO_PITCH_1BR_FLOOR_PLAN;

  it("matches the Mono Pitch 4884 typology depth", () => {
    expect(plan.typology).toBe("mono-pitch-4884");
    expect(plan.depthMm).toBe(4884);
  });

  it("uses the standard 1BR frame combo (2C, length 6106 mm)", () => {
    // 0 × 1221 + 0 × 2442 + 2 × 3053 = 6106 mm structural length
    expect(plan.baseLengthMm).toBe(6106);
    const jumps = jumpsForLengthMm(plan.baseLengthMm);
    expect(jumps).toBe(10);
    expect(decomposeJumps(jumps)).toEqual({ A: 0, B: 0, C: 2 });
  });

  it("has length bounds aligned to 8–20 jumps of 610 mm", () => {
    expect(plan.jumpSizeMm).toBe(610);
    expect(plan.minLengthMm).toBe(8 * 610);
    expect(plan.maxLengthMm).toBe(20 * 610);
  });

  it("ships standard-model cost defaults (1BR CC Mono)", () => {
    expect(plan.costDefaults.partitionsM).toBe(6.0);
    expect(plan.costDefaults.interiorDoors).toBe(2);
    expect(plan.costDefaults.aluminiumSqm).toBe(7.9);
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
    for (const expected of ["Bathroom", "Bedroom", "Living Room", "Veranda"]) {
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

  it("orders zones so living stretches first, wet-core last", () => {
    const orders = Object.fromEntries(plan.zones.map((z) => [z.id, z.order]));
    expect(orders["zone-living"]).toBe(1);
    expect(orders["zone-bedroom"]).toBe(2);
    expect(orders["zone-wet-core"]).toBe(3);
  });

  it("assigns a valid zoneId to every non-structural element", () => {
    const zoneIds = new Set(plan.zones.map((z) => z.id));
    for (const el of plan.elements) {
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

  it("declares 2 interior doors + 1 entrance (1BR / 1 bath)", () => {
    const doors = plan.elements.filter((e) => e.type === "door");
    expect(doors).toHaveLength(3);
    expect(plan.bathrooms).toBe(1);
    expect(doors.map((d) => d.id)).toContain("door-entrance");
  });

  it("populates moving / stretching element lists for every zone", () => {
    const ids = new Set(plan.elements.map((e) => e.id));
    for (const zone of plan.zones) {
      for (const id of zone.movingElementIds) {
        expect(ids, `unknown moving element ${id} in ${zone.id}`).toContain(id);
      }
      for (const id of zone.stretchingElementIds) {
        expect(ids, `unknown stretching element ${id} in ${zone.id}`).toContain(
          id,
        );
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

  it("supports zone stretching across the full slider range", () => {
    const minLayout = layoutZones(plan, { targetLengthMm: 0 });
    const maxLayout = layoutZones(plan, { targetLengthMm: 99_999 });
    expect(minLayout.totalLengthMm).toBe(minLayout.minLengthMm);
    expect(maxLayout.totalLengthMm).toBe(maxLayout.maxLengthMm);
    // At max, the living zone should have absorbed most of the delta first.
    const livingMax = maxLayout.zones.find((z) => z.id === "zone-living")!;
    const livingMaxDef = plan.zones.find((z) => z.id === "zone-living")!;
    expect(livingMax.widthMm).toBe(livingMaxDef.maxWidthMm);
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

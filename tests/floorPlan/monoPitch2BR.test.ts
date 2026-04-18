import { describe, expect, it } from "vitest";
import { MONO_PITCH_2BR_FLOOR_PLAN } from "@/data/floorPlans/monoPitch2BR";
import type { FloorPlanElement } from "@/types/floorPlan";

describe("2BR Mono Pitch floor plan", () => {
  const plan = MONO_PITCH_2BR_FLOOR_PLAN;

  it("matches the Mono Pitch 4884 typology depth", () => {
    expect(plan.typology).toBe("mono-pitch-4884");
    expect(plan.depthMm).toBe(4884);
  });

  it("uses the standard 2BR frame combo (1B + 2C, length 8547 mm)", () => {
    // 1 × 2442 + 2 × 3053 = 8547 mm structural length
    expect(plan.baseLengthMm).toBe(8547);
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

  it("declares 3 interior doors + 1 entrance (2BR / 1 bath)", () => {
    const doors = plan.elements.filter((e) => e.type === "door");
    expect(doors).toHaveLength(4);
    expect(plan.bathrooms).toBe(1);
    expect(doors.map((d) => d.id)).toContain("door-entrance");
  });

  it("populates moving / stretching element lists for every zone", () => {
    for (const zone of plan.zones) {
      const ids = new Set(plan.elements.map((e) => e.id));
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

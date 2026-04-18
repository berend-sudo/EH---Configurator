import { describe, expect, it } from "vitest";
import { MONO_PITCH_1BR_FLOOR_PLAN } from "@/data/floorPlans/monoPitch1BR";
import type { WallElement } from "@/types/floorPlan";

describe("1BR south wall veranda opening", () => {
  const plan = MONO_PITCH_1BR_FLOOR_PLAN;

  // OUTER_DEPTH = 4972, P_VERANDA_WEST = 3053, OUTER_WIDTH = 6194
  const wallSouth = plan.elements.find(
    (e) => e.id === "wall-south",
  ) as WallElement;

  it("wall-south exists and is a wall type", () => {
    expect(wallSouth).toBeDefined();
    expect(wallSouth.type).toBe("wall");
  });

  it("wall-south starts at the west edge (x=0) at OUTER_DEPTH", () => {
    expect(wallSouth.points[0]).toEqual([0, 4972]);
  });

  it("wall-south ends at P_VERANDA_WEST — no segment crosses into the veranda", () => {
    expect(wallSouth.points[wallSouth.points.length - 1]).toEqual([3053, 4972]);
  });

  it("no wall element draws a horizontal segment at OUTER_DEPTH east of P_VERANDA_WEST (veranda is open)", () => {
    const walls = plan.elements.filter((e) => e.type === "wall") as WallElement[];
    let hasVierandaSegment = false;
    for (const w of walls) {
      for (let i = 0; i + 1 < w.points.length; i++) {
        const [x1, y1] = w.points[i];
        const [x2, y2] = w.points[i + 1];
        // A horizontal segment at y=OUTER_DEPTH that has any x > P_VERANDA_WEST
        if (y1 === 4972 && y2 === 4972 && (x1 > 3053 || x2 > 3053)) {
          hasVierandaSegment = true;
        }
      }
    }
    expect(hasVierandaSegment).toBe(false);
  });
});

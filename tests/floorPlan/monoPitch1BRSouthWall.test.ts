import { describe, expect, it } from "vitest";
import { MONO_PITCH_1BR_FLOOR_PLAN } from "@/data/floorPlans/monoPitch1BR";
import type { WallElement } from "@/types/floorPlan";

describe("1BR south wall veranda opening", () => {
  const plan = MONO_PITCH_1BR_FLOOR_PLAN;
  const extWall = plan.elements.find(
    (e) => e.id === "wall-external",
  ) as WallElement;

  // OUTER_DEPTH = 4972, P_VERANDA_WEST = 3053, INNER_X1 = 6106, ENTRANCE_X = 3400
  const southPoints = extWall.points.filter(([, y]) => y === 4972);

  it("south wall has a notch point at P_VERANDA_WEST (west edge of veranda opening)", () => {
    expect(southPoints.some(([x]) => x === 3053)).toBe(true);
  });

  it("south wall has a notch point at INNER_X1 (east edge of veranda opening)", () => {
    expect(southPoints.some(([x]) => x === 6106)).toBe(true);
  });

  it("south wall does not place a notch at ENTRANCE_X (the door, not the veranda opening)", () => {
    expect(southPoints.some(([x]) => x === 3400)).toBe(false);
  });
});

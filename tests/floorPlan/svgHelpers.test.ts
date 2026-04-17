import { describe, expect, it } from "vitest";
import {
  __test_polygonPath,
  __test_polylinePath,
} from "@/components/FloorPlanSVG";

describe("SVG path helpers", () => {
  it("polylinePath moves then lines between points", () => {
    expect(
      __test_polylinePath([
        [0, 0],
        [100, 0],
        [100, 50],
      ]),
    ).toBe("M 0 0 L 100 0 L 100 50");
  });

  it("polygonPath closes with Z", () => {
    expect(
      __test_polygonPath([
        [0, 0],
        [10, 0],
        [10, 10],
      ]),
    ).toBe("M 0 0 L 10 0 L 10 10 Z");
  });
});

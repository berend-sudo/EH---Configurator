import { describe, it, expect } from "vitest";
import {
  sxT,
  syT,
  bboxOf,
  vertWorld,
  applyDelta,
  polygonAreaM2,
  buildWindowPositions,
  roomPatternId,
  roomDisplayName,
  splinePath,
  detectDoorWallEdge,
  windowsOnWall,
  buildChain,
  MAX_WINDOW_WIDTH_MM,
  type WindowPositions,
} from "@/lib/floorplan/geometry";
import type { FloorplanJSON, Vertex } from "@/types/floorplan";
import { loadAllPlans } from "@/lib/__tests__/fixtures";

const noWp: WindowPositions = new Map();

describe("sxT / syT (mm world → SVG px)", () => {
  it("sxT applies scale and pad", () => {
    expect(sxT(0, 0.1, 50)).toBe(50);
    expect(sxT(1000, 0.1, 50)).toBe(150);
  });
  it("syT flips Y and offsets by padY + drawH", () => {
    // world y = 0 → svg y = padY + drawH
    expect(syT(0, 0.1, 200, 50)).toBe(250);
    // world y = drawH/scale → svg y = padY
    expect(syT(2000, 0.1, 200, 50)).toBe(50);
  });
});

describe("bboxOf", () => {
  it("computes min/max/w/h", () => {
    const bb = bboxOf([
      { x: 1, y: 2 },
      { x: 5, y: 3 },
      { x: 2, y: 9 },
    ]);
    expect(bb.minX).toBe(1);
    expect(bb.maxX).toBe(5);
    expect(bb.minY).toBe(2);
    expect(bb.maxY).toBe(9);
    expect(bb.w).toBe(4);
    expect(bb.h).toBe(7);
  });
});

describe("vertWorld", () => {
  const v = (x: number, y: number, moveX = false, attach?: Vertex["attach"]): Vertex => ({
    x, y, moveX, ...(attach ? { attach } : {}),
  });

  it("returns x+delta when moveX is true", () => {
    expect(vertWorld(v(100, 50, true), 30, noWp)).toEqual({ x: 130, y: 50 });
  });
  it("ignores delta when moveX is false", () => {
    expect(vertWorld(v(100, 50, false), 30, noWp)).toEqual({ x: 100, y: 50 });
  });
  it("snaps to the attached window vertex when set", () => {
    const wp: WindowPositions = new Map([[0, [{ x: 999, y: 888 }]]]);
    const out = vertWorld(v(100, 50, true, { windowIdx: 0, vertexIdx: 0 }), 30, wp);
    expect(out).toEqual({ x: 999, y: 888 });
  });
  it("falls back to delta math if the attached window/vertex doesn't exist", () => {
    const wp: WindowPositions = new Map();
    const out = vertWorld(v(100, 50, true, { windowIdx: 99, vertexIdx: 99 }), 30, wp);
    expect(out).toEqual({ x: 130, y: 50 });
  });
});

describe("applyDelta", () => {
  it("preserves length and order", () => {
    const verts: Vertex[] = [
      { x: 0, y: 0, moveX: false },
      { x: 100, y: 0, moveX: true },
    ];
    const out = applyDelta(verts, 50, noWp);
    expect(out).toHaveLength(2);
    expect(out[0]).toEqual({ x: 0, y: 0 });
    expect(out[1]).toEqual({ x: 150, y: 0 });
  });
});

describe("polygonAreaM2", () => {
  it("computes 1 m² for a 1 m × 1 m square (mm coords)", () => {
    const verts: Vertex[] = [
      { x: 0,    y: 0,    moveX: false },
      { x: 1000, y: 0,    moveX: false },
      { x: 1000, y: 1000, moveX: false },
      { x: 0,    y: 1000, moveX: false },
    ];
    expect(polygonAreaM2(verts, 0, noWp)).toBeCloseTo(1, 6);
  });

  it("scales linearly when delta stretches one edge", () => {
    const verts: Vertex[] = [
      { x: 0,    y: 0,    moveX: false },
      { x: 1000, y: 0,    moveX: true },  // moves with delta
      { x: 1000, y: 1000, moveX: true },  // moves with delta
      { x: 0,    y: 1000, moveX: false },
    ];
    // delta = 1000 → square becomes 2 m × 1 m → 2 m²
    expect(polygonAreaM2(verts, 1000, noWp)).toBeCloseTo(2, 6);
  });
});

describe("buildWindowPositions — window cap math", () => {
  function planWithOneWindow(verts: { x: number; y: number; moveX: boolean }[]): FloorplanJSON {
    return {
      id: "test",
      name: "test",
      baseWidth: 5000,
      baseDepth: 3000,
      minDelta: 0,
      maxDelta: 3000,
      layers: [
        {
          name: "Windows",
          entities: [
            {
              type: "polyline",
              closed: true,
              vertices: verts.map((v) => ({ ...v, attach: undefined })),
            },
          ],
        },
      ],
    };
  }

  it("returns an empty map when there's no Windows layer", () => {
    const plan: FloorplanJSON = {
      id: "x", name: "x", baseWidth: 1000, baseDepth: 1000,
      minDelta: 0, maxDelta: 0, layers: [],
    };
    expect(buildWindowPositions(plan, 100).size).toBe(0);
  });

  it("translates the whole window when both edges have moveX", () => {
    const plan = planWithOneWindow([
      { x: 100,  y: 0, moveX: true },
      { x: 1000, y: 0, moveX: true },
      { x: 1000, y: 50, moveX: true },
      { x: 100,  y: 50, moveX: true },
    ]);
    const wp = buildWindowPositions(plan, 200);
    const pts = wp.get(0)!;
    // All points shift by +200 — pure translation.
    expect(pts.map((p) => p.x)).toEqual([300, 1200, 1200, 300]);
  });

  it("caps the right edge when only the right edge moves", () => {
    // A 1.2 m window. Cap allows growth up to 1.8 m → max additional 600 mm.
    const plan = planWithOneWindow([
      { x: 100,  y: 0, moveX: false },
      { x: 1300, y: 0, moveX: true },
      { x: 1300, y: 50, moveX: true },
      { x: 100,  y: 50, moveX: false },
    ]);
    const wp = buildWindowPositions(plan, 2000); // way past the cap
    const pts = wp.get(0)!;
    // Left edge stays at x=100; right edge clamped at 100 + 1800 = 1900.
    expect(pts[0].x).toBe(100);
    expect(pts[3].x).toBe(100);
    expect(pts[1].x).toBe(1900);
    expect(pts[2].x).toBe(1900);
    // Final width === cap
    expect(pts[1].x - pts[0].x).toBe(MAX_WINDOW_WIDTH_MM);
  });
});

describe("roomPatternId / roomDisplayName", () => {
  it.each([
    ["Rooms$Bath Room", "pat-bath"],
    ["Rooms$Terrace", "pat-terrace"],
    ["Rooms$Bed Room", "pat-living"],
    ["Rooms$Living Room", "pat-living"],
    ["Rooms", "pat-living"],
  ])("roomPatternId(%s) → %s", (input, expected) => {
    expect(roomPatternId(input)).toBe(expected);
  });

  it.each([
    ["Rooms", "Room"],
    ["Rooms$Bed Room", "Bed Room"],
    ["Rooms-Kitchen", "Kitchen"],
  ])("roomDisplayName(%s) → %s", (input, expected) => {
    expect(roomDisplayName(input)).toBe(expected);
  });
});

describe("splinePath", () => {
  it("returns empty string for <2 points", () => {
    expect(splinePath([], 1, 0, 0, 0)).toBe("");
    expect(splinePath([{ x: 0, y: 0 }], 1, 0, 0, 0)).toBe("");
  });
  it("emits a 2-point line as M…L", () => {
    expect(splinePath([{ x: 0, y: 0 }, { x: 10, y: 0 }], 1, 0, 0, 0))
      .toMatch(/^M .* L /);
  });
  it("emits cubic Bézier segments for 3+ points", () => {
    const d = splinePath(
      [{ x: 0, y: 0 }, { x: 5, y: 5 }, { x: 10, y: 0 }],
      1, 0, 0, 0,
    );
    expect(d).toMatch(/^M/);
    expect(d).toContain(" C ");
  });
});

describe("detectDoorWallEdge", () => {
  const bb = { minX: 0, minY: 0, maxX: 1000, maxY: 1000, w: 1000, h: 1000 };

  it("returns 'top' when both endpoints lie on the top edge", () => {
    expect(detectDoorWallEdge([{ x: 0, y: 1000 }, { x: 50, y: 1000 }], bb)).toBe("top");
  });
  it("returns 'bottom' when both endpoints lie on the bottom edge", () => {
    expect(detectDoorWallEdge([{ x: 0, y: 0 }, { x: 50, y: 0 }], bb)).toBe("bottom");
  });
  it("returns 'left' when both endpoints lie on the left edge", () => {
    expect(detectDoorWallEdge([{ x: 0, y: 100 }, { x: 0, y: 200 }], bb)).toBe("left");
  });
  it("returns 'right' when both endpoints lie on the right edge", () => {
    expect(detectDoorWallEdge([{ x: 1000, y: 100 }, { x: 1000, y: 200 }], bb)).toBe("right");
  });
  it("returns null when endpoints don't share an edge", () => {
    expect(detectDoorWallEdge([{ x: 500, y: 500 }, { x: 600, y: 600 }], bb)).toBeNull();
  });
});

describe("buildChain", () => {
  it("returns a single segment when there are no intervals", () => {
    expect(buildChain(0, 100, [])).toEqual([{ from: 0, to: 100 }]);
  });
  it("interleaves wall segments and window intervals", () => {
    const chain = buildChain(0, 1000, [
      { min: 200, max: 400 },
      { min: 600, max: 800 },
    ]);
    expect(chain).toEqual([
      { from: 0,   to: 200  },
      { from: 200, to: 400  },
      { from: 400, to: 600  },
      { from: 600, to: 800  },
      { from: 800, to: 1000 },
    ]);
  });
  it("skips a leading wall segment if the first window touches wallStart", () => {
    const chain = buildChain(0, 1000, [{ min: 0, max: 300 }]);
    expect(chain[0]).toEqual({ from: 0, to: 300 });
  });
});

describe("windowsOnWall — real plans", () => {
  const plans = loadAllPlans();

  it.each(plans)("$id finds at least one window somewhere", ({ parsed }) => {
    const wp = buildWindowPositions(parsed, 0);
    const allSides = (["top", "bottom", "left", "right"] as const).flatMap(
      (side) => windowsOnWall(parsed, 0, side, wp),
    );
    expect(allSides.length).toBeGreaterThan(0);
  });
});

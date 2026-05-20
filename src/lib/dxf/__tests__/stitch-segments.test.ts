import { describe, it, expect } from "vitest";
import { stitchSegments, type Segment } from "../stitch-segments";

const seg = (x1: number, y1: number, x2: number, y2: number): Segment => ({
  vertices: [{ x: x1, y: y1 }, { x: x2, y: y2 }],
});

describe("stitchSegments", () => {
  it("stitches a clean 4-segment rectangle into one closed polyline", () => {
    // Real-world example: the 1826 mm wall fragment in 1BR that ships as
    // 4 LINE primitives instead of a closed POLYLINE.
    const segs: Segment[] = [
      seg(2709.5, 4972, 4535.6, 4972),
      seg(4535.6, 4972, 4535.6, 4845),
      seg(4535.6, 4845, 2709.5, 4845),
      seg(2709.5, 4845, 2709.5, 4972),
    ];
    const { polylines, nearMisses } = stitchSegments(segs, 2);
    expect(polylines).toHaveLength(1);
    expect(polylines[0].closed).toBe(true);
    expect(polylines[0].vertices).toHaveLength(4);
    expect(polylines[0].sourceCount).toBe(4);
    expect(nearMisses).toHaveLength(0);
  });

  it("handles two disconnected rectangles as two separate closed polylines", () => {
    const segs: Segment[] = [
      // Rectangle A
      seg(0, 0, 100, 0),  seg(100, 0, 100, 50),
      seg(100, 50, 0, 50), seg(0, 50, 0, 0),
      // Rectangle B (far away)
      seg(1000, 1000, 1200, 1000),  seg(1200, 1000, 1200, 1100),
      seg(1200, 1100, 1000, 1100),  seg(1000, 1100, 1000, 1000),
    ];
    const { polylines } = stitchSegments(segs, 2);
    expect(polylines).toHaveLength(2);
    expect(polylines.every((p) => p.closed)).toBe(true);
    expect(polylines.every((p) => p.vertices.length === 4)).toBe(true);
  });

  it("auto-closes a chain whose tips meet within tolerance (export drift)", () => {
    // Last vertex (0, 0.5) is 0.5 mm from the first (0, 0) — drift, not
    // architectural intent. Should close.
    const segs: Segment[] = [
      seg(0, 0, 100, 0),
      seg(100, 0, 100, 50),
      seg(100, 50, 0, 50),
      seg(0, 50, 0, 0.5), // 0.5 mm short of the start
    ];
    const { polylines, nearMisses } = stitchSegments(segs, 2);
    expect(polylines).toHaveLength(1);
    expect(polylines[0].closed).toBe(true);
    expect(nearMisses).toHaveLength(0);
  });

  it("leaves a chain open and reports a near-miss when the gap exceeds tolerance", () => {
    // 5 mm gap — beyond the 2 mm export drift bound, so probably real.
    const segs: Segment[] = [
      seg(0, 0, 100, 0),
      seg(100, 0, 100, 50),
      seg(100, 50, 0, 50),
      seg(0, 50, 0, 5), // 5 mm short
    ];
    const { polylines, nearMisses } = stitchSegments(segs, 2);
    expect(polylines).toHaveLength(1);
    expect(polylines[0].closed).toBe(false);
    expect(nearMisses).toHaveLength(1);
    expect(nearMisses[0].gapMm).toBeCloseTo(5, 3);
  });

  it("emits stray segments unchanged as open polylines", () => {
    // A single LINE that doesn't connect to anything (decorative / annotation).
    const segs: Segment[] = [seg(0, 0, 50, 0)];
    const { polylines, nearMisses } = stitchSegments(segs, 2);
    expect(polylines).toHaveLength(1);
    expect(polylines[0].closed).toBe(false);
    expect(polylines[0].vertices).toEqual([{ x: 0, y: 0 }, { x: 50, y: 0 }]);
    expect(nearMisses).toHaveLength(0); // single segment is intentional, not a near-miss
  });

  it("preserves interior vertices of multi-control-point SPLINEs", () => {
    // A curved 4-vertex segment from a SPLINE, plus 3 straight LINEs
    // completing a closed shape. The curve must survive.
    const segs: Segment[] = [
      { vertices: [
        { x: 0, y: 0 }, { x: 25, y: 10 }, { x: 50, y: 15 }, { x: 100, y: 0 },
      ] }, // SPLINE with 4 ctrl points
      seg(100, 0, 100, 50),
      seg(100, 50, 0, 50),
      seg(0, 50, 0, 0),
    ];
    const { polylines } = stitchSegments(segs, 2);
    expect(polylines).toHaveLength(1);
    expect(polylines[0].closed).toBe(true);
    expect(polylines[0].vertices).toHaveLength(6); // 4 from spline + 2 corners (interior vertices preserved)
    // Confirm the interior curve points survived in the right place
    expect(polylines[0].vertices).toContainEqual({ x: 25, y: 10 });
    expect(polylines[0].vertices).toContainEqual({ x: 50, y: 15 });
  });

  it("handles segments encountered in arbitrary order", () => {
    // Same rectangle as the first test, but supplied middle-first.
    const segs: Segment[] = [
      seg(4535.6, 4972, 4535.6, 4845),  // right edge
      seg(2709.5, 4845, 2709.5, 4972),  // left edge
      seg(2709.5, 4972, 4535.6, 4972),  // top edge
      seg(4535.6, 4845, 2709.5, 4845),  // bottom edge
    ];
    const { polylines } = stitchSegments(segs, 2);
    expect(polylines).toHaveLength(1);
    expect(polylines[0].closed).toBe(true);
    expect(polylines[0].vertices).toHaveLength(4);
  });

  it("does not collapse a chain across a 50 mm gap (sanity bound on tolerance)", () => {
    const segs: Segment[] = [
      seg(0, 0, 100, 0),
      seg(150, 0, 250, 0), // 50 mm gap between segments
    ];
    const { polylines } = stitchSegments(segs, 2);
    // Two stray open segments, no false stitching.
    expect(polylines).toHaveLength(2);
    expect(polylines.every((p) => !p.closed)).toBe(true);
  });
});

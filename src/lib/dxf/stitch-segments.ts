// Reassembles open LINE / SPLINE segments back into closed polylines.
//
// Some CAD exports drop the `closed` flag from POLYLINE entities and emit
// each edge of a rectangle (or other closed shape) as a separate primitive.
// Visually the original closed polygon was the architect's intent; the
// parser stitches the pieces back together so walls / windows / doors / rooms
// render as filled shapes again.
//
// Algorithm: per call, walk connected components by matching endpoint
// proximity within `tolMm`. A chain whose front and back tips meet within
// tolerance is emitted closed. Chains that never close stay open.

export type Pt = { x: number; y: number };
export type Segment = { vertices: Pt[] };
export type StitchedPolyline = { closed: boolean; vertices: Pt[]; sourceCount: number };

export interface StitchResult {
  polylines: StitchedPolyline[];
  /** Diagnostic: chains that almost closed but fell outside the tolerance.
   *  Includes the residual gap distance so a caller can warn / surface it. */
  nearMisses: { gapMm: number; vertexCount: number }[];
}

export function stitchSegments(segs: Segment[], tolMm: number): StitchResult {
  const tolSq = tolMm * tolMm;
  const ptEq = (a: Pt, b: Pt): boolean => {
    const dx = a.x - b.x, dy = a.y - b.y;
    return dx * dx + dy * dy <= tolSq;
  };
  const ptDist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);

  const used = new Set<number>();
  const polylines: StitchedPolyline[] = [];
  const nearMisses: { gapMm: number; vertexCount: number }[] = [];

  for (let i = 0; i < segs.length; i++) {
    if (used.has(i)) continue;
    used.add(i);

    // Seed the chain with this segment's vertices (preserves curves for
    // multi-control-point SPLINEs).
    const chain: Pt[] = [...segs[i].vertices];
    let sourceCount = 1;
    let front = chain[chain.length - 1];
    let back = chain[0];

    // Extend forward.
    let extended = true;
    while (extended) {
      extended = false;
      for (let j = 0; j < segs.length; j++) {
        if (used.has(j)) continue;
        const sv = segs[j].vertices;
        if (ptEq(sv[0], front)) {
          for (let k = 1; k < sv.length; k++) chain.push(sv[k]);
          front = chain[chain.length - 1];
          used.add(j); sourceCount++; extended = true; break;
        }
        if (ptEq(sv[sv.length - 1], front)) {
          for (let k = sv.length - 2; k >= 0; k--) chain.push(sv[k]);
          front = chain[chain.length - 1];
          used.add(j); sourceCount++; extended = true; break;
        }
      }
    }

    // Extend backward — skipped if forward already closed the loop.
    if (!ptEq(front, back)) {
      extended = true;
      while (extended) {
        extended = false;
        for (let j = 0; j < segs.length; j++) {
          if (used.has(j)) continue;
          const sv = segs[j].vertices;
          if (ptEq(sv[sv.length - 1], back)) {
            for (let k = sv.length - 2; k >= 0; k--) chain.unshift(sv[k]);
            back = chain[0];
            used.add(j); sourceCount++; extended = true; break;
          }
          if (ptEq(sv[0], back)) {
            for (let k = 1; k < sv.length; k++) chain.unshift(sv[k]);
            back = chain[0];
            used.add(j); sourceCount++; extended = true; break;
          }
        }
      }
    }

    const closingGap = ptDist(chain[0], chain[chain.length - 1]);
    const closed = chain.length >= 3 && closingGap <= tolMm;
    if (closed) {
      chain.pop(); // drop the duplicate closing vertex
    } else if (chain.length >= 4 && closingGap < tolMm * 50) {
      // Almost closed but outside the bound — caller should investigate.
      nearMisses.push({ gapMm: closingGap, vertexCount: chain.length });
    }
    polylines.push({ closed, vertices: chain, sourceCount });
  }

  return { polylines, nearMisses };
}

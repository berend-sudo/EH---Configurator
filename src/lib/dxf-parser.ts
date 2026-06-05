import type {
  FloorplanJSON,
  FloorplanLayer,
  PolylineEntity,
  BlockEntity,
  BlockGeom,
  GeomPolyline,
  GeomSpline,
  GeomCircle,
  Vertex,
} from "@/types/floorplan";
import { stitchSegments } from "@/lib/dxf/stitch-segments";

// ── Pair parsing ─────────────────────────────────────────────────────────────

interface Pair { code: number; value: string }

function parsePairs(content: string): Pair[] {
  const lines = content.split(/\r?\n/);
  const out: Pair[] = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = parseInt(lines[i].trim(), 10);
    if (!isNaN(code)) out.push({ code, value: lines[i + 1].trim() });
  }
  return out;
}

function n(s: string) { return parseFloat(s) || 0; }

/** Layers whose POLYLINE geometry we render (walls, doors, windows, furniture, rooms). */
function isPlanLayer(layer: string): boolean {
  return (
    layer === "Walls" ||
    layer === "Doors" ||
    layer === "Windows" ||
    layer === "Furniture" ||
    layer === "Furniture Stretch" ||
    layer.startsWith("Rooms")
  );
}

/** Layers whose loose LINE/SPLINE segments get stitched into closed polylines.
 *  Furniture is excluded — its geometry comes from block INSERTs / polylines. */
function isStitchLayer(layer: string): boolean {
  return (
    layer === "Walls" ||
    layer === "Doors" ||
    layer === "Windows" ||
    layer.startsWith("Rooms")
  );
}

// ── Zone classifier: nearest PT wins ─────────────────────────────────────────

function decideMoveX(
  x: number, y: number,
  right: { x: number; y: number }[],
  left:  { x: number; y: number }[],
): boolean {
  if (right.length === 0) return false;
  if (left.length === 0)  return true;
  let dR = Infinity, dL = Infinity;
  for (const p of right) {
    const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
    if (d < dR) dR = d;
  }
  for (const p of left) {
    const d = (p.x - x) * (p.x - x) + (p.y - y) * (p.y - y);
    if (d < dL) dL = d;
  }
  return dR < dL;
}

// ── Transform a local block-space point to world space ───────────────────────
// Order: scale → rotate → translate (matches DXF INSERT semantics)

function transformPoint(
  lx: number, ly: number,
  ix: number, iy: number,
  rotDeg: number,
  sx: number, sy: number,
): { x: number; y: number } {
  const xs = lx * sx;
  const ys = ly * sy;
  const r = (rotDeg * Math.PI) / 180;
  const cos = Math.cos(r), sin = Math.sin(r);
  return { x: ix + xs * cos - ys * sin, y: iy + xs * sin + ys * cos };
}

// ── Local geometry primitives (before flattening) ────────────────────────────

interface LocalLine    { type: "line";    layer: string; x1: number; y1: number; x2: number; y2: number }
interface LocalArc     { type: "arc";     layer: string; cx: number; cy: number; r: number; sa: number; ea: number }
interface LocalCircle  { type: "circle";  layer: string; cx: number; cy: number; r: number }
interface LocalPoly    { type: "poly";    layer: string; closed: boolean; verts: { x: number; y: number }[] }
interface LocalSpline  { type: "spline";  layer: string; pts: { x: number; y: number }[]; closed?: boolean; ctrl?: boolean; degree?: number; knots?: number[] }
interface LocalPoint   { type: "point";   layer: string; x: number; y: number }
type LocalGeom = LocalLine | LocalArc | LocalCircle | LocalPoly | LocalSpline | LocalPoint;

// ── DXF readers ───────────────────────────────────────────────────────────────

function readPolyline(
  pairs: Pair[],
  start: number,
): { layer: string; closed: boolean; vertices: { x: number; y: number }[]; end: number } {
  let flags = 0, layer = "", j = start;
  while (j < pairs.length && pairs[j].code !== 0) {
    if (pairs[j].code === 8)  layer = pairs[j].value;
    if (pairs[j].code === 70) flags = parseInt(pairs[j].value, 10);
    j++;
  }
  const vertices: { x: number; y: number }[] = [];
  while (j < pairs.length) {
    if (pairs[j].code === 0 && pairs[j].value === "VERTEX") {
      let k = j + 1, vx = 0, vy = 0, vf = 0;
      while (k < pairs.length && pairs[k].code !== 0) {
        if (pairs[k].code === 10) vx = n(pairs[k].value);
        if (pairs[k].code === 20) vy = n(pairs[k].value);
        if (pairs[k].code === 70) vf = parseInt(pairs[k].value, 10);
        k++;
      }
      if (!(vf & 192)) vertices.push({ x: vx, y: vy });
      j = k;
    } else if (pairs[j].code === 0 && pairs[j].value === "SEQEND") {
      j++; break;
    } else if (pairs[j].code === 0) {
      break;
    } else {
      j++;
    }
  }
  return { layer, closed: !!(flags & 1), vertices, end: j };
}

function readBlockDef(pairs: Pair[], start: number): { geom: LocalGeom[]; end: number } {
  const geom: LocalGeom[] = [];
  let i = start;

  while (i < pairs.length) {
    const { code, value } = pairs[i];
    if (code === 0 && (value === "ENDBLK" || value === "BLOCK")) break;

    if (code === 0 && value === "LINE") {
      let j = i + 1, x1 = 0, y1 = 0, x2 = 0, y2 = 0, layer = "";
      while (j < pairs.length && pairs[j].code !== 0) {
        if (pairs[j].code === 8)  layer = pairs[j].value;
        if (pairs[j].code === 10) x1 = n(pairs[j].value);
        if (pairs[j].code === 20) y1 = n(pairs[j].value);
        if (pairs[j].code === 11) x2 = n(pairs[j].value);
        if (pairs[j].code === 21) y2 = n(pairs[j].value);
        j++;
      }
      geom.push({ type: "line", layer, x1, y1, x2, y2 });
      i = j; continue;
    }

    if (code === 0 && value === "ARC") {
      let j = i + 1, cx = 0, cy = 0, r = 0, sa = 0, ea = 360, layer = "";
      while (j < pairs.length && pairs[j].code !== 0) {
        if (pairs[j].code === 8)  layer = pairs[j].value;
        if (pairs[j].code === 10) cx = n(pairs[j].value);
        if (pairs[j].code === 20) cy = n(pairs[j].value);
        if (pairs[j].code === 40) r  = n(pairs[j].value);
        if (pairs[j].code === 50) sa = n(pairs[j].value);
        if (pairs[j].code === 51) ea = n(pairs[j].value);
        j++;
      }
      geom.push({ type: "arc", layer, cx, cy, r, sa, ea });
      i = j; continue;
    }

    if (code === 0 && value === "CIRCLE") {
      let j = i + 1, cx = 0, cy = 0, r = 0, layer = "";
      while (j < pairs.length && pairs[j].code !== 0) {
        if (pairs[j].code === 8)  layer = pairs[j].value;
        if (pairs[j].code === 10) cx = n(pairs[j].value);
        if (pairs[j].code === 20) cy = n(pairs[j].value);
        if (pairs[j].code === 40) r  = n(pairs[j].value);
        j++;
      }
      geom.push({ type: "circle", layer, cx, cy, r });
      i = j; continue;
    }

    if (code === 0 && value === "POLYLINE") {
      const { layer, closed, vertices, end } = readPolyline(pairs, i + 1);
      if (vertices.length > 0) geom.push({ type: "poly", layer, closed, verts: vertices });
      i = end; continue;
    }

    if (code === 0 && value === "HATCH") {
      // Solid hatches define filled regions whose outline is the *only*
      // record of certain shapes (e.g. toilet cistern body). Extract
      // polyline-type boundary paths as outlines so they get rendered.
      let j = i + 1, layer = "", numPaths = 0;
      while (j < pairs.length && pairs[j].code !== 0) {
        if (pairs[j].code === 8) layer = pairs[j].value;
        if (pairs[j].code === 91) { numPaths = parseInt(pairs[j].value, 10); j++; break; }
        j++;
      }
      for (let p = 0; p < numPaths && j < pairs.length && pairs[j].code !== 0; p++) {
        while (j < pairs.length && pairs[j].code !== 0 && pairs[j].code !== 92) j++;
        if (j >= pairs.length || pairs[j].code === 0) break;
        const pathType = parseInt(pairs[j].value, 10);
        j++;
        if (pathType & 2) {
          let closed = true, numVerts = 0;
          while (j < pairs.length && pairs[j].code !== 0 && pairs[j].code !== 93) {
            if (pairs[j].code === 73) closed = parseInt(pairs[j].value, 10) === 1;
            j++;
          }
          if (j < pairs.length && pairs[j].code === 93) { numVerts = parseInt(pairs[j].value, 10); j++; }
          const verts: { x: number; y: number }[] = [];
          let curX: number | null = null;
          while (j < pairs.length && pairs[j].code !== 0 && verts.length < numVerts) {
            if (pairs[j].code === 10) curX = n(pairs[j].value);
            else if (pairs[j].code === 20 && curX !== null) {
              verts.push({ x: curX, y: n(pairs[j].value) });
              curX = null;
            }
            j++;
          }
          if (verts.length > 2) geom.push({ type: "poly", layer, closed, verts });
        } else {
          break;
        }
      }
      while (j < pairs.length && pairs[j].code !== 0) j++;
      i = j; continue;
    }

    if (code === 0 && value === "SPLINE") {
      let j = i + 1, layer = "", flags = 0, degree = 3;
      const fit: { x: number; y: number }[] = [];
      const ctrl: { x: number; y: number }[] = [];
      const knots: number[] = [];
      let fx: number | null = null, cpx: number | null = null;
      while (j < pairs.length && pairs[j].code !== 0) {
        const c = pairs[j].code, v = pairs[j].value;
        if (c === 8) layer = v;
        if (c === 70) flags = parseInt(v, 10) || 0;
        if (c === 71) degree = parseInt(v, 10) || degree;
        // 40 = knot value (one per knot, repeated). Comes BEFORE control-point
        // codes (10/20) and weights (41), so it can't collide with them here.
        if (c === 40) knots.push(n(v));
        if (c === 11) fx = n(v);
        if (c === 21 && fx !== null) { fit.push({ x: fx, y: n(v) }); fx = null; }
        if (c === 10) cpx = n(v);
        if (c === 20 && cpx !== null) { ctrl.push({ x: cpx, y: n(v) }); cpx = null; }
        j++;
      }
      // Prefer fit points (they lie ON the curve). When only control points
      // exist we'll evaluate the B-spline properly (de Boor) downstream, using
      // the degree + knot vector captured here.
      const useFit = fit.length > 0;
      const pts = useFit ? fit : ctrl;
      if (pts.length > 1) {
        geom.push({
          type: "spline",
          layer,
          pts,
          closed: !!(flags & 1),
          ctrl: !useFit,
          degree,
          knots: knots.length > 0 ? knots : undefined,
        });
      }
      i = j; continue;
    }

    if (code === 0 && value === "POINT") {
      let j = i + 1, layer = "", px = 0, py = 0;
      while (j < pairs.length && pairs[j].code !== 0) {
        if (pairs[j].code === 8)  layer = pairs[j].value;
        if (pairs[j].code === 10) px = n(pairs[j].value);
        if (pairs[j].code === 20) py = n(pairs[j].value);
        j++;
      }
      geom.push({ type: "point", layer, x: px, y: py });
      i = j; continue;
    }

    i++;
  }

  return { geom, end: i };
}

// ── Tessellation: arcs and circles → world-space polylines ───────────────────

const ARC_SEGMENTS = 32;

function tessellateArc(
  g: LocalArc,
  ix: number, iy: number, rotDeg: number, sx: number, sy: number,
): { x: number; y: number }[] {
  let sa = g.sa, ea = g.ea;
  if (ea <= sa) ea += 360;
  const sweep = ea - sa;
  const steps = Math.max(2, Math.ceil((sweep / 360) * ARC_SEGMENTS));
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ang = ((sa + t * sweep) * Math.PI) / 180;
    const lx = g.cx + g.r * Math.cos(ang);
    const ly = g.cy + g.r * Math.sin(ang);
    pts.push(transformPoint(lx, ly, ix, iy, rotDeg, sx, sy));
  }
  return pts;
}

function tessellateCircle(
  g: LocalCircle,
  ix: number, iy: number, rotDeg: number, sx: number, sy: number,
): { x: number; y: number }[] {
  const steps = ARC_SEGMENTS;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < steps; i++) {
    const ang = (i / steps) * 2 * Math.PI;
    const lx = g.cx + g.r * Math.cos(ang);
    const ly = g.cy + g.r * Math.sin(ang);
    pts.push(transformPoint(lx, ly, ix, iy, rotDeg, sx, sy));
  }
  return pts;
}

// ── B-spline evaluation (de Boor) for control-point DXF splines ──────────────
// Chaikin corner-cutting (used previously) converges to a quadratic B-spline,
// which produced visible kinks on cubic furniture curves (the couch). De Boor
// evaluates the actual B-spline of the given degree and knot vector, so the
// result matches the CAD curve.

function uniformOpenKnots(numCtrl: number, degree: number): number[] {
  // Clamped uniform knot vector on [0, 1]:
  //   first degree+1 knots = 0
  //   last  degree+1 knots = 1
  //   middle (numCtrl - degree - 1) interior knots evenly spaced.
  const total = numCtrl + degree + 1;
  const interior = total - 2 * (degree + 1);
  const k: number[] = [];
  for (let i = 0; i <= degree; i++) k.push(0);
  for (let i = 1; i <= interior; i++) k.push(i / (interior + 1));
  for (let i = 0; i <= degree; i++) k.push(1);
  return k;
}

function deBoorEval(
  t: number,
  ctrl: { x: number; y: number }[],
  knots: number[],
  degree: number,
): { x: number; y: number } {
  // Find knot span k with knots[k] <= t < knots[k+1] (clamping at the end).
  const n = ctrl.length - 1;
  let k = degree;
  while (k < n && t >= knots[k + 1]) k++;
  const d: { x: number; y: number }[] = [];
  for (let i = 0; i <= degree; i++) d.push({ ...ctrl[k - degree + i] });
  for (let r = 1; r <= degree; r++) {
    for (let i = degree; i >= r; i--) {
      const idx = k - degree + i;
      const denom = knots[idx + degree - r + 1] - knots[idx];
      const a = denom === 0 ? 0 : (t - knots[idx]) / denom;
      d[i] = {
        x: (1 - a) * d[i - 1].x + a * d[i].x,
        y: (1 - a) * d[i - 1].y + a * d[i].y,
      };
    }
  }
  return d[degree];
}

const SPLINE_SAMPLES_PER_SPAN = 12;

function tessellateSpline(
  ctrl: { x: number; y: number }[],
  degreeIn: number | undefined,
  knotsIn: number[] | undefined,
): { x: number; y: number }[] {
  const degree = Math.max(1, Math.min(degreeIn ?? 3, ctrl.length - 1));

  // Closed AutoCAD splines (periodic flag) are exported with a clamped knot
  // vector and the first control point repeated at the end, so the standard
  // de Boor evaluation below already produces the full closed curve. We must
  // therefore honour the supplied knots — a uniform/periodic re-derivation
  // deformed the shape (e.g. the oval coffee table became a rounded rectangle).
  // The DXF can omit knots, or supply an arbitrary clamped vector. Either way
  // we normalise to [0, 1] and synthesise a uniform clamped vector when needed.
  const expected = ctrl.length + degree + 1;
  let knots = knotsIn && knotsIn.length === expected ? knotsIn.slice() : uniformOpenKnots(ctrl.length, degree);
  const tMin = knots[degree];
  const tMax = knots[knots.length - degree - 1];
  if (tMax > tMin) {
    knots = knots.map((v) => (v - tMin) / (tMax - tMin));
  }
  // Sample with extra density across each non-zero interior span.
  const spans = ctrl.length - degree;
  const total = Math.max(8, spans * SPLINE_SAMPLES_PER_SPAN);
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= total; i++) {
    // Clamp t to the last span open-end so de Boor lands cleanly on ctrl[n].
    const t = Math.min(0.999999, i / total);
    pts.push(deBoorEval(t, ctrl, knots, degree));
  }
  return pts;
}

// ── Flatten all local geometry to world-space polylines/splines ──────────────

function flattenGeom(
  localGeom: LocalGeom[],
  ix: number, iy: number, rotDeg: number, sx: number, sy: number,
): BlockGeom[] {
  const out: BlockGeom[] = [];

  for (const g of localGeom) {
    if (g.type === "point") continue;
    if (g.layer === "FurnitureRefRec" || g.layer === "MeubelRefRec") continue;

    if (g.type === "line") {
      const p1 = transformPoint(g.x1, g.y1, ix, iy, rotDeg, sx, sy);
      const p2 = transformPoint(g.x2, g.y2, ix, iy, rotDeg, sx, sy);
      out.push({ type: "polyline", closed: false, vertices: [p1, p2], layer: g.layer } as GeomPolyline);
    } else if (g.type === "arc") {
      const verts = tessellateArc(g, ix, iy, rotDeg, sx, sy);
      out.push({ type: "polyline", closed: false, vertices: verts, layer: g.layer } as GeomPolyline);
    } else if (g.type === "circle") {
      // For uniform scale (the common case) preserve a true circle so it
      // renders as native SVG <circle>. Non-uniform scale would turn it
      // into an ellipse — fall back to polygon tessellation in that case.
      if (Math.abs(Math.abs(sx) - Math.abs(sy)) < 1e-9) {
        const center = transformPoint(g.cx, g.cy, ix, iy, rotDeg, sx, sy);
        out.push({ type: "circle", cx: center.x, cy: center.y, r: g.r * Math.abs(sx), layer: g.layer } as GeomCircle);
      } else {
        const verts = tessellateCircle(g, ix, iy, rotDeg, sx, sy);
        out.push({ type: "polyline", closed: true, vertices: verts, layer: g.layer } as GeomPolyline);
      }
    } else if (g.type === "poly") {
      const verts = g.verts.map((v) => transformPoint(v.x, v.y, ix, iy, rotDeg, sx, sy));
      out.push({ type: "polyline", closed: g.closed, vertices: verts, layer: g.layer } as GeomPolyline);
    } else if (g.type === "spline") {
      if (g.ctrl) {
        // Control-point B-spline: evaluate the actual curve with de Boor,
        // using the degree + knots supplied in the DXF (uniform clamped knots
        // are synthesised when missing). Drawing a curve *through* control
        // points would distort the shape (e.g. chair backs, couch arms).
        const curve = tessellateSpline(g.pts, g.degree, g.knots);
        const verts = curve.map((v) => transformPoint(v.x, v.y, ix, iy, rotDeg, sx, sy));
        out.push({ type: "polyline", closed: !!g.closed, vertices: verts, layer: g.layer } as GeomPolyline);
      } else {
        const points = g.pts.map((v) => transformPoint(v.x, v.y, ix, iy, rotDeg, sx, sy));
        out.push({ type: "spline", points, layer: g.layer } as GeomSpline);
      }
    }
  }

  return out;
}

// ── Extract PT Top Left/Right Furniture points from local geometry ────────────

function extractBlockPoints(localGeom: LocalGeom[]): {
  tlLocal: { x: number; y: number } | null;
  trLocal: { x: number; y: number } | null;
} {
  let tlLocal = null, trLocal = null;
  for (const g of localGeom) {
    if (g.type !== "point") continue;
    if (g.layer === "PT Top Left Furniture")  tlLocal = { x: g.x, y: g.y };
    if (g.layer === "PT Top Right Furniture") trLocal = { x: g.x, y: g.y };
  }
  return { tlLocal, trLocal };
}

// ── Geometry bounding-box centre (world space) ───────────────────────────────
// Classify a piece by where it actually sits, not by a single corner/vertex.
// A corner can land on a marker for the wrong zone (e.g. a couch corner on a
// fixed "PT Top Left"), and a window can split across the boundary so one edge
// moves and the other doesn't — which shears the walls attached to it. Using
// the centroid resolves the whole piece to one zone.
function centreOf(pts: { x: number; y: number }[]): { x: number; y: number } | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const v of pts) {
    if (v.x < minX) minX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.x > maxX) maxX = v.x;
    if (v.y > maxY) maxY = v.y;
  }
  if (minX === Infinity) return null;
  return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
}

function geomCentre(geom: BlockGeom[]): { x: number; y: number } | null {
  const pts: { x: number; y: number }[] = [];
  for (const g of geom) {
    if (g.type === "polyline") pts.push(...g.vertices);
    else if (g.type === "spline") pts.push(...g.points);
    else if (g.type === "circle") { pts.push({ x: g.cx - g.r, y: g.cy - g.r }, { x: g.cx + g.r, y: g.cy + g.r }); }
  }
  return centreOf(pts);
}

// ── Compute depth vector from TL→TR axis into the furniture body ─────────────

function computeDepthVec(
  tl: { x: number; y: number },
  tr: { x: number; y: number },
  geom: BlockGeom[],
): { x: number; y: number } {
  const dx = tr.x - tl.x, dy = tr.y - tl.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1e-9) return { x: 0, y: 0 };
  const rx = dx / len, ry = dy / len;
  const pA = { x:  ry, y: -rx };
  const pB = { x: -ry, y:  rx };
  let sumA = 0, maxA = 0, sumB = 0, maxB = 0, count = 0;
  const project = (x: number, y: number) => {
    const relX = x - tl.x, relY = y - tl.y;
    const a = relX * pA.x + relY * pA.y;
    const b = relX * pB.x + relY * pB.y;
    if (a > maxA) maxA = a;
    if (b > maxB) maxB = b;
    sumA += a; sumB += b; count++;
  };
  for (const g of geom) {
    if (g.type === "polyline") {
      for (const v of g.vertices) project(v.x, v.y);
    } else if (g.type === "circle") {
      // Approximate the circle by its bounding box corners so that burner
      // / dial circles contribute their full extent to the depth estimate.
      project(g.cx - g.r, g.cy - g.r);
      project(g.cx + g.r, g.cy + g.r);
      project(g.cx - g.r, g.cy + g.r);
      project(g.cx + g.r, g.cy - g.r);
    }
  }
  const useA = count === 0 || sumA >= sumB;
  const depth = useA ? maxA : maxB;
  const perp  = useA ? pA : pB;
  return { x: perp.x * depth, y: perp.y * depth };
}

// ── Main parser ───────────────────────────────────────────────────────────────

export function parseDxf(content: string, filename: string): FloorplanJSON {
  const pairs = parsePairs(content);

  const ptRight: { x: number; y: number }[] = [];
  const ptLeft:  { x: number; y: number }[] = [];
  const polylines: { layer: string; closed: boolean; vertices: { x: number; y: number }[] }[] = [];
  // Free-standing LINE / SPLINE entities on Walls/Doors/Windows/Rooms layers —
  // stitched back into closed (or open) polylines after the parse loop.
  const segments: { layer: string; vertices: { x: number; y: number }[] }[] = [];
  const inserts: { layer: string; name: string; x: number; y: number; rotation: number; scaleX: number; scaleY: number }[] = [];
  const blockDefs = new Map<string, LocalGeom[]>();

  let section = "";
  let i = 0;

  while (i < pairs.length) {
    const { code, value } = pairs[i];

    if (code === 2 && value === "BLOCKS")   { section = "BLOCKS";   i++; continue; }
    if (code === 2 && value === "ENTITIES") { section = "ENTITIES"; i++; continue; }
    if (code === 0 && value === "ENDSEC")   { section = "";         i++; continue; }

    if (section === "BLOCKS" && code === 0 && value === "BLOCK") {
      let j = i + 1, blockName = "";
      while (j < pairs.length && pairs[j].code !== 0) {
        if (pairs[j].code === 2) { blockName = pairs[j].value; break; }
        j++;
      }
      while (j < pairs.length && pairs[j].code !== 0) j++;
      const { geom, end } = readBlockDef(pairs, j);
      if (blockName && !blockName.startsWith("*"))
        blockDefs.set(blockName, geom);
      i = end; continue;
    }

    if (section === "ENTITIES") {
      if (code === 0 && value === "POINT") {
        let j = i + 1, layer = "", px = 0, py = 0;
        while (j < pairs.length && pairs[j].code !== 0) {
          if (pairs[j].code === 8)  layer = pairs[j].value;
          if (pairs[j].code === 10) px = n(pairs[j].value);
          if (pairs[j].code === 20) py = n(pairs[j].value);
          j++;
        }
        // Accept both English (v4) and Dutch (legacy) zone layer names
        if (layer === "PT Top Right" || layer === "PT Rechtsboven") ptRight.push({ x: px, y: py });
        else if (layer === "PT Top Left" || layer === "PT Linksboven") ptLeft.push({ x: px, y: py });
        i = j; continue;
      }

      if (code === 0 && value === "POLYLINE") {
        const { layer, closed, vertices, end } = readPolyline(pairs, i + 1);
        if (isPlanLayer(layer)) {
          polylines.push({ layer, closed, vertices });
        }
        i = end; continue;
      }

      // DXF export often drops the `closed` flag on a POLYLINE and emits each
      // edge as a separate LINE or 2-control-point SPLINE — the newer
      // gable/aframe/clerestory drawings store most walls this way (Gable Large
      // has ~92 wall splines). Collect them as segments; the stitcher pass
      // after the loop reassembles connected chains into the closed polygons
      // the architect drew, so walls render filled instead of as bare outlines.
      if (code === 0 && value === "LINE") {
        let j = i + 1, layer = "", x1 = 0, y1 = 0, x2 = 0, y2 = 0;
        while (j < pairs.length && pairs[j].code !== 0) {
          if (pairs[j].code === 8)  layer = pairs[j].value;
          else if (pairs[j].code === 10) x1 = n(pairs[j].value);
          else if (pairs[j].code === 20) y1 = n(pairs[j].value);
          else if (pairs[j].code === 11) x2 = n(pairs[j].value);
          else if (pairs[j].code === 21) y2 = n(pairs[j].value);
          j++;
        }
        if (isStitchLayer(layer)) {
          segments.push({ layer, vertices: [{ x: x1, y: y1 }, { x: x2, y: y2 }] });
        }
        i = j; continue;
      }

      if (code === 0 && value === "SPLINE") {
        let j = i + 1, layer = "";
        const xs: number[] = [], ys: number[] = [];
        while (j < pairs.length && pairs[j].code !== 0) {
          if (pairs[j].code === 8)  layer = pairs[j].value;
          else if (pairs[j].code === 10) xs.push(n(pairs[j].value));
          else if (pairs[j].code === 20) ys.push(n(pairs[j].value));
          j++;
        }
        if (isStitchLayer(layer) && xs.length >= 2 && xs.length === ys.length) {
          segments.push({ layer, vertices: xs.map((x, k) => ({ x, y: ys[k] })) });
        }
        i = j; continue;
      }

      if (code === 0 && value === "INSERT") {
        let j = i + 1, layer = "", name = "", ix = 0, iy = 0, rot = 0, sx = 1, sy = 1;
        while (j < pairs.length && pairs[j].code !== 0) {
          if (pairs[j].code === 8)  layer = pairs[j].value;
          if (pairs[j].code === 2)  name  = pairs[j].value;
          if (pairs[j].code === 10) ix    = n(pairs[j].value);
          if (pairs[j].code === 20) iy    = n(pairs[j].value);
          if (pairs[j].code === 41) sx    = n(pairs[j].value);
          if (pairs[j].code === 42) sy    = n(pairs[j].value);
          if (pairs[j].code === 50) rot   = n(pairs[j].value);
          j++;
        }
        // Furniture/fixture blocks are authored across several layers in the
        // newer drawings — not just "Furniture" but also "Default" and even the
        // "PT Top Left" layer (e.g. living-room seating "Zithoek", tables, and
        // small beds). Ingest any INSERT that isn't on a structural layer so
        // that furniture stops disappearing from living rooms.
        if (!isStitchLayer(layer)) inserts.push({ layer, name, x: ix, y: iy, rotation: rot, scaleX: sx, scaleY: sy });
        i = j; continue;
      }
    }

    i++;
  }

  // ── Segment stitcher ────────────────────────────────────────────────────────
  // Reassemble the loose LINE/SPLINE edges collected above into the closed
  // polygons the architect originally drew, grouped per layer, so walls and
  // windows render as filled shapes rather than bare outlines. 2 mm tolerance
  // matches the observed export drift. Algorithm lives in ./dxf/stitch-segments.
  const STITCH_TOL_MM = 2;
  const segmentsByLayer = new Map<string, typeof segments>();
  for (const s of segments) {
    const arr = segmentsByLayer.get(s.layer);
    if (arr) arr.push(s);
    else segmentsByLayer.set(s.layer, [s]);
  }
  segmentsByLayer.forEach((segs, layerName) => {
    const { polylines: stitched } = stitchSegments(segs, STITCH_TOL_MM);
    for (const p of stitched) {
      polylines.push({ layer: layerName, closed: p.closed, vertices: p.vertices });
    }
  });

  // "Furniture Stretch" only appears once the plan is widened, so it must not
  // define the base footprint (maxX/maxY → baseWidth/baseDepth) nor constrain
  // minDelta — those describe the plan at its minimum width, where it's hidden.
  let maxX = 0, maxY = 0;
  for (const p of polylines) {
    if (p.layer === "Furniture Stretch") continue;
    for (const v of p.vertices) {
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
    }
  }

  const roomLayerNames = Array.from(new Set(polylines.filter(p => p.layer.startsWith("Rooms")).map(p => p.layer)));
  const LAYER_ORDER = [...roomLayerNames, "Walls", "Doors", "Windows", "Furniture", "Furniture Stretch"];
  const layerMap = new Map<string, FloorplanLayer>(
    LAYER_ORDER.map((name) => [name, { name, entities: [] }])
  );

  for (const raw of polylines) {
    const layer = layerMap.get(raw.layer);
    if (!layer) continue;
    // Windows translate as a rigid unit: classify the whole window by its
    // centre and apply that to every vertex. Per-vertex classification could
    // split a window (one edge moving, one fixed) so it stretched instead of
    // translating — which sheared the walls attached to its corners. Walls and
    // rooms stay per-vertex so they still stretch across the zone boundary.
    const unitMoveX =
      raw.layer === "Windows"
        ? (() => { const c = centreOf(raw.vertices); return c ? decideMoveX(c.x, c.y, ptRight, ptLeft) : false; })()
        : null;
    const vertices: Vertex[] = raw.vertices.map((v) => ({
      x: v.x,
      y: v.y,
      moveX: unitMoveX ?? decideMoveX(v.x, v.y, ptRight, ptLeft),
    }));
    layer.entities.push({ type: "polyline", closed: raw.closed, vertices } as PolylineEntity);
  }

  // Window-cutout alignment: a wall/room/door vertex that sits exactly on a
  // window corner inherits that window's zone (moveX), so the cutout moves
  // *with* its window when the plan is stretched. Windows are rigid units
  // (classified above), so a long wall with a window opening stretches without
  // tearing (the cutout tracks the window) AND a room whose wall holds a window
  // doesn't shear (the cutout shares the window's single zone). This replaces an
  // older pass that copied the window's world *position* onto the wall vertex,
  // which sheared walls into triangles.
  const ATTACH_TOL_SQ = 5 * 5; // 5 mm
  const windowsLayer = layerMap.get("Windows");
  if (windowsLayer) {
    const winVerts: Array<{ x: number; y: number; moveX: boolean }> = [];
    for (const wEnt of windowsLayer.entities) {
      if (wEnt.type !== "polyline") continue;
      for (const wv of wEnt.vertices) winVerts.push({ x: wv.x, y: wv.y, moveX: wv.moveX });
    }
    layerMap.forEach((layer, layerName) => {
      if (layerName === "Windows" || layerName === "Furniture" || layerName === "Furniture Stretch") return;
      for (const ent of layer.entities) {
        if (ent.type !== "polyline") continue;
        for (const v of ent.vertices) {
          let bestSq = ATTACH_TOL_SQ;
          let best: { moveX: boolean } | undefined;
          for (const wv of winVerts) {
            const dx = wv.x - v.x, dy = wv.y - v.y;
            const sq = dx * dx + dy * dy;
            if (sq <= bestSq) { bestSq = sq; best = wv; }
          }
          if (best) v.moveX = best.moveX;
        }
      }
    });
  }

  const furnitureLayer = layerMap.get("Furniture")!;
  const furnitureStretchLayer = layerMap.get("Furniture Stretch")!;
  for (const ins of inserts) {
    const localGeom = blockDefs.get(ins.name) ?? [];
    const { tlLocal, trLocal } = extractBlockPoints(localGeom);
    const geom = flattenGeom(localGeom, ins.x, ins.y, ins.rotation, ins.scaleX, ins.scaleY);

    let tl: { x: number; y: number } | null = null;
    let tr: { x: number; y: number } | null = null;
    let depthVec = { x: 0, y: 0 };

    if (tlLocal && trLocal) {
      tl = transformPoint(tlLocal.x, tlLocal.y, ins.x, ins.y, ins.rotation, ins.scaleX, ins.scaleY);
      tr = transformPoint(trLocal.x, trLocal.y, ins.x, ins.y, ins.rotation, ins.scaleX, ins.scaleY);
      depthVec = computeDepthVec(tl, tr, geom);
    }

    // Classify the block by its geometry centre so it lands in the zone where
    // it visually sits. (A TL/TR corner can coincide with a marker for the
    // wrong zone — e.g. the living-room couch pinned fixed by a corner marker.)
    const centre = geomCentre(geom) ?? { x: ins.x, y: ins.y };
    const moveX = decideMoveX(centre.x, centre.y, ptRight, ptLeft);

    const targetLayer = ins.layer === "Furniture Stretch" ? furnitureStretchLayer : furnitureLayer;
    targetLayer.entities.push({
      type: "block",
      name: ins.name,
      x: ins.x,
      y: ins.y,
      rotation: ins.rotation,
      scaleX: ins.scaleX,
      scaleY: ins.scaleY,
      moveX,
      tl,
      tr,
      depthVec,
      geom,
    } as BlockEntity);
  }

  // ── Auto-compute minDelta ─────────────────────────────────────────────────
  // Find rightmost fixed interior wall vertex; find leftmost moving furniture
  // left edge. minDelta = clearance needed to avoid overlap.
  let fixedInteriorMaxX = 0;
  let movingMinX = Infinity;
  const interiorMin = 500, interiorMax = maxX - 500;

  for (const raw of polylines) {
    if (raw.layer === "Furniture Stretch") continue;
    for (const v of raw.vertices) {
      const moving = decideMoveX(v.x, v.y, ptRight, ptLeft);
      if (!moving && v.x > interiorMin && v.x < interiorMax) {
        if (v.x > fixedInteriorMaxX) fixedInteriorMaxX = v.x;
      }
      if (moving) {
        if (v.x < movingMinX) movingMinX = v.x;
      }
    }
  }

  for (const ent of furnitureLayer.entities) {
    if (ent.type !== "block" || !ent.moveX) continue;
    if (ent.tl && ent.tr) {
      const leftEdge = Math.min(ent.tl.x, ent.tr.x);
      if (leftEdge < movingMinX) movingMinX = leftEdge;
    } else {
      for (const g of ent.geom) {
        if (g.type === "polyline") {
          for (const v of g.vertices) {
            if (v.x < movingMinX) movingMinX = v.x;
          }
        }
      }
    }
  }

  const rawMinDelta = fixedInteriorMaxX > 0 && movingMinX < Infinity
    ? Math.max(0, fixedInteriorMaxX - movingMinX)
    : 0;
  const minDelta = Math.ceil(rawMinDelta / 610) * 610;

  const rawMax = Math.round(maxX * 0.5);
  const maxDelta = minDelta + Math.floor((rawMax - minDelta) / 610) * 610;

  const name = filename.replace(/\.dxf$/i, "");
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  // Derive the mezzanine record from the Rooms$Mezzanine sublayer (if any).
  // Spec area = shoelace at delta=0 (raw vertices). The runtime, delta-aware
  // area is computed by countRooms; this is the model's intrinsic spec.
  const mezzLayer = layerMap.get("Rooms$Mezzanine");
  const mezzPolys = mezzLayer
    ? mezzLayer.entities
        .filter((e): e is PolylineEntity => e.type === "polyline" && e.closed)
        .map((e) => ({ vertices: e.vertices.map((v) => ({ x: v.x, y: v.y })) }))
    : [];
  let mezzAreaMm2 = 0;
  for (const poly of mezzPolys) {
    let a = 0;
    const verts = poly.vertices;
    for (let i = 0; i < verts.length; i++) {
      const j = (i + 1) % verts.length;
      a += verts[i].x * verts[j].y - verts[j].x * verts[i].y;
    }
    mezzAreaMm2 += Math.abs(a) / 2;
  }
  const mezzanine = mezzPolys.length > 0
    ? { footprints: mezzPolys, areaM2: mezzAreaMm2 / 1_000_000 }
    : null;

  return {
    id,
    name,
    baseWidth: Math.round(maxX),
    baseDepth: Math.round(maxY),
    minDelta,
    maxDelta,
    layers: LAYER_ORDER.map((nm) => layerMap.get(nm)!).filter((l) => l.entities.length > 0),
    mezzanine,
  };
}

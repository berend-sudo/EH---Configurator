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
interface LocalSpline  { type: "spline";  layer: string; pts: { x: number; y: number }[] }
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
      let j = i + 1, layer = "";
      const fit: { x: number; y: number }[] = [];
      const ctrl: { x: number; y: number }[] = [];
      let fx: number | null = null, cpx: number | null = null;
      while (j < pairs.length && pairs[j].code !== 0) {
        const c = pairs[j].code, v = pairs[j].value;
        if (c === 8) layer = v;
        if (c === 11) fx = n(v);
        if (c === 21 && fx !== null) { fit.push({ x: fx, y: n(v) }); fx = null; }
        if (c === 10) cpx = n(v);
        if (c === 20 && cpx !== null) { ctrl.push({ x: cpx, y: n(v) }); cpx = null; }
        j++;
      }
      const pts = fit.length > 0 ? fit : ctrl;
      if (pts.length > 1) geom.push({ type: "spline", layer, pts });
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
      out.push({ type: "polyline", closed: false, vertices: [p1, p2] } as GeomPolyline);
    } else if (g.type === "arc") {
      const verts = tessellateArc(g, ix, iy, rotDeg, sx, sy);
      out.push({ type: "polyline", closed: false, vertices: verts } as GeomPolyline);
    } else if (g.type === "circle") {
      // For uniform scale (the common case) preserve a true circle so it
      // renders as native SVG <circle>. Non-uniform scale would turn it
      // into an ellipse — fall back to polygon tessellation in that case.
      if (Math.abs(Math.abs(sx) - Math.abs(sy)) < 1e-9) {
        const center = transformPoint(g.cx, g.cy, ix, iy, rotDeg, sx, sy);
        out.push({ type: "circle", cx: center.x, cy: center.y, r: g.r * Math.abs(sx) } as GeomCircle);
      } else {
        const verts = tessellateCircle(g, ix, iy, rotDeg, sx, sy);
        out.push({ type: "polyline", closed: true, vertices: verts } as GeomPolyline);
      }
    } else if (g.type === "poly") {
      const verts = g.verts.map((v) => transformPoint(v.x, v.y, ix, iy, rotDeg, sx, sy));
      out.push({ type: "polyline", closed: g.closed, vertices: verts } as GeomPolyline);
    } else if (g.type === "spline") {
      const points = g.pts.map((v) => transformPoint(v.x, v.y, ix, iy, rotDeg, sx, sy));
      out.push({ type: "spline", points } as GeomSpline);
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
  const inserts: { name: string; x: number; y: number; rotation: number; scaleX: number; scaleY: number }[] = [];
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
        if (layer === "Walls" || layer === "Doors" || layer === "Windows" || layer === "Furniture" || layer.startsWith("Rooms")) {
          polylines.push({ layer, closed, vertices });
        }
        i = end; continue;
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
        if (layer === "Furniture") inserts.push({ name, x: ix, y: iy, rotation: rot, scaleX: sx, scaleY: sy });
        i = j; continue;
      }
    }

    i++;
  }

  let maxX = 0, maxY = 0;
  for (const p of polylines) {
    for (const v of p.vertices) {
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
    }
  }

  const roomLayerNames = Array.from(new Set(polylines.filter(p => p.layer.startsWith("Rooms")).map(p => p.layer)));
  const LAYER_ORDER = [...roomLayerNames, "Walls", "Doors", "Windows", "Furniture"];
  const layerMap = new Map<string, FloorplanLayer>(
    LAYER_ORDER.map((name) => [name, { name, entities: [] }])
  );

  for (const raw of polylines) {
    const layer = layerMap.get(raw.layer);
    if (!layer) continue;
    const vertices: Vertex[] = raw.vertices.map((v) => ({
      x: v.x,
      y: v.y,
      moveX: decideMoveX(v.x, v.y, ptRight, ptLeft),
    }));
    layer.entities.push({ type: "polyline", closed: raw.closed, vertices } as PolylineEntity);
  }

  // ── Attachment pass: tag wall/room/door vertices coincident with window corners
  // Wall vertices at a window's cutout corner must track that window vertex's
  // computed world position (including any width cap), not just shift by delta.
  const ATTACH_TOL_SQ = 5 * 5; // 5 mm
  const windowsLayer = layerMap.get("Windows");
  if (windowsLayer) {
    const winVerts: Array<{ windowIdx: number; vertexIdx: number; x: number; y: number }> = [];
    let widx = 0;
    for (const wEnt of windowsLayer.entities) {
      if (wEnt.type !== "polyline") continue;
      for (let vi = 0; vi < wEnt.vertices.length; vi++) {
        const wv = wEnt.vertices[vi];
        winVerts.push({ windowIdx: widx, vertexIdx: vi, x: wv.x, y: wv.y });
      }
      widx++;
    }
    layerMap.forEach((layer, layerName) => {
      if (layerName === "Windows" || layerName === "Furniture") return;
      for (const ent of layer.entities) {
        if (ent.type !== "polyline") continue;
        for (const v of ent.vertices) {
          let bestSq = ATTACH_TOL_SQ;
          let best: { windowIdx: number; vertexIdx: number } | undefined;
          for (const wv of winVerts) {
            const dx = wv.x - v.x, dy = wv.y - v.y;
            const sq = dx * dx + dy * dy;
            if (sq <= bestSq) {
              bestSq = sq;
              best = { windowIdx: wv.windowIdx, vertexIdx: wv.vertexIdx };
            }
          }
          if (best) v.attach = best;
        }
      }
    });
  }

  const furnitureLayer = layerMap.get("Furniture")!;
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

    // Use TL/TR left edge for zone classification; fall back to insertion point
    const refX = (tl && tr) ? Math.min(tl.x, tr.x) : ins.x;
    const moveX = decideMoveX(refX, ins.y, ptRight, ptLeft);

    furnitureLayer.entities.push({
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

  return {
    id,
    name,
    baseWidth: Math.round(maxX),
    baseDepth: Math.round(maxY),
    minDelta,
    maxDelta,
    layers: LAYER_ORDER.map((nm) => layerMap.get(nm)!).filter((l) => l.entities.length > 0),
  };
}

import type {
  FloorplanJSON,
  FloorplanLayer,
  PolylineEntity,
  BlockEntity,
  BlockGeom,
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

// Nearest-zone classifier: a point moves if the nearest PT Rechtsboven is
// closer than the nearest PT Linksboven. This makes the PT layers act as
// zone markers rather than per-vertex tags, so untagged vertices on the
// "right side" still move and untagged vertices on the "left side" stay,
// avoiding the mixed-move distortion when the architect only marked some
// corners explicitly.
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

// ── Geometry helpers ──────────────────────────────────────────────────────────

function rotatePt(x: number, y: number, deg: number) {
  const r = (deg * Math.PI) / 180;
  return { x: x * Math.cos(r) - y * Math.sin(r), y: x * Math.sin(r) + y * Math.cos(r) };
}

// Flatten a local-space point to world space
function toWorld(lx: number, ly: number, ix: number, iy: number, rot: number) {
  const p = rotatePt(lx, ly, rot);
  return { x: ix + p.x, y: iy + p.y };
}

// ── Low-level DXF readers (advance index, return {data, end}) ─────────────────

function readPolyline(
  pairs: Pair[],
  start: number,
): { closed: boolean; vertices: { x: number; y: number }[]; end: number } {
  let flags = 0, j = start;
  while (j < pairs.length && pairs[j].code !== 0) {
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
  return { closed: !!(flags & 1), vertices, end: j };
}

// ── Block definition reader ───────────────────────────────────────────────────

interface LocalGeom {
  type: string;
  layer: string;
  [key: string]: unknown;
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
      let peekLayer = "", pj = i + 1;
      while (pj < pairs.length && pairs[pj].code !== 0) {
        if (pairs[pj].code === 8) { peekLayer = pairs[pj].value; break; }
        pj++;
      }
      const { closed, vertices, end } = readPolyline(pairs, i + 1);
      if (vertices.length > 0)
        geom.push({ type: "polyline", layer: peekLayer, closed, vertices });
      i = end; continue;
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

    i++;
  }

  return { geom, end: i };
}

// ── Flatten local-space geometry to world space ───────────────────────────────

function flattenGeom(localGeom: LocalGeom[], ix: number, iy: number, rot: number): BlockGeom[] {
  const out: BlockGeom[] = [];
  for (const g of localGeom) {
    if (g.layer === "MeubelRefRec") continue; // skip reference rectangles

    if (g.type === "line") {
      const p1 = toWorld(g.x1 as number, g.y1 as number, ix, iy, rot);
      const p2 = toWorld(g.x2 as number, g.y2 as number, ix, iy, rot);
      out.push({ type: "line", x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y });
    } else if (g.type === "arc") {
      const c = toWorld(g.cx as number, g.cy as number, ix, iy, rot);
      out.push({
        type: "arc",
        cx: c.x, cy: c.y, r: g.r as number,
        startAngle: (g.sa as number) + rot,
        endAngle:   (g.ea as number) + rot,
      });
    } else if (g.type === "circle") {
      const c = toWorld(g.cx as number, g.cy as number, ix, iy, rot);
      out.push({ type: "circle", cx: c.x, cy: c.y, r: g.r as number });
    } else if (g.type === "polyline") {
      const vertices = (g.vertices as { x: number; y: number }[]).map(
        (v) => toWorld(v.x, v.y, ix, iy, rot),
      );
      out.push({ type: "polyline", closed: g.closed as boolean, vertices });
    } else if (g.type === "spline") {
      const points = (g.pts as { x: number; y: number }[]).map(
        (v) => toWorld(v.x, v.y, ix, iy, rot),
      );
      out.push({ type: "spline", points });
    }
  }
  return out;
}

// ── Main parser ───────────────────────────────────────────────────────────────

export function parseDxf(content: string, filename: string): FloorplanJSON {
  const pairs = parsePairs(content);

  const ptRight: { x: number; y: number }[] = [];
  const ptLeft:  { x: number; y: number }[] = [];
  const polylines: { layer: string; closed: boolean; vertices: { x: number; y: number }[] }[] = [];
  const inserts: { name: string; x: number; y: number; rotation: number }[] = [];
  const blockDefs = new Map<string, LocalGeom[]>();

  let section = "";
  let i = 0;

  while (i < pairs.length) {
    const { code, value } = pairs[i];

    if (code === 2 && value === "BLOCKS")   { section = "BLOCKS";   i++; continue; }
    if (code === 2 && value === "ENTITIES") { section = "ENTITIES"; i++; continue; }
    if (code === 0 && value === "ENDSEC")   { section = "";         i++; continue; }

    // ── BLOCKS: read each block definition ──
    if (section === "BLOCKS" && code === 0 && value === "BLOCK") {
      // find block name (first code=2 after BLOCK, before next code=0)
      let j = i + 1, blockName = "";
      while (j < pairs.length && pairs[j].code !== 0) {
        if (pairs[j].code === 2) { blockName = pairs[j].value; break; }
        j++;
      }
      // advance past header to first entity (next code=0 pair)
      while (j < pairs.length && pairs[j].code !== 0) j++;
      const { geom, end } = readBlockDef(pairs, j);
      if (blockName && !blockName.startsWith("*"))
        blockDefs.set(blockName, geom);
      i = end; continue;
    }

    // ── ENTITIES ──
    if (section === "ENTITIES") {

      if (code === 0 && value === "POINT") {
        let j = i + 1, layer = "", px = 0, py = 0;
        while (j < pairs.length && pairs[j].code !== 0) {
          if (pairs[j].code === 8)  layer = pairs[j].value;
          if (pairs[j].code === 10) px = n(pairs[j].value);
          if (pairs[j].code === 20) py = n(pairs[j].value);
          j++;
        }
        if (layer === "PT Rechtsboven") ptRight.push({ x: px, y: py });
        else if (layer === "PT Linksboven")  ptLeft.push({ x: px, y: py });
        i = j; continue;
      }

      if (code === 0 && value === "POLYLINE") {
        let j = i + 1, layer = "", flags = 0;
        while (j < pairs.length && pairs[j].code !== 0) {
          if (pairs[j].code === 8)  layer = pairs[j].value;
          if (pairs[j].code === 70) flags = parseInt(pairs[j].value, 10);
          j++;
        }
        const RENDER = ["Walls", "Rooms", "Doors", "Windows"];
        if (RENDER.includes(layer)) {
          const { closed, vertices, end } = readPolyline(pairs, j);
          polylines.push({ layer, closed: closed || !!(flags & 1), vertices });
          i = end; continue;
        }
        const { end } = readPolyline(pairs, j);
        i = end; continue;
      }

      if (code === 0 && value === "INSERT") {
        let j = i + 1, layer = "", name = "", ix = 0, iy = 0, rot = 0;
        while (j < pairs.length && pairs[j].code !== 0) {
          if (pairs[j].code === 8)  layer = pairs[j].value;
          if (pairs[j].code === 2)  name  = pairs[j].value;
          if (pairs[j].code === 10) ix  = n(pairs[j].value);
          if (pairs[j].code === 20) iy  = n(pairs[j].value);
          if (pairs[j].code === 50) rot = n(pairs[j].value);
          j++;
        }
        if (layer === "Furniture") inserts.push({ name, x: ix, y: iy, rotation: rot });
        i = j; continue;
      }
    }

    i++;
  }

  // ── Bounding box from wall/room geometry ──────────────────────────────────
  let maxX = 0, maxY = 0;
  for (const p of polylines) {
    for (const v of p.vertices) {
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
    }
  }

  // ── Assemble layers ───────────────────────────────────────────────────────
  const LAYER_ORDER = ["Rooms", "Walls", "Doors", "Windows", "Furniture"];
  const layerMap = new Map<string, FloorplanLayer>(
    LAYER_ORDER.map((name) => [name, { name, entities: [] }])
  );

  // Wall/room/door/window polylines
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

  // Furniture inserts — flatten geometry to world space, simple proximity moveX
  const furnitureLayer = layerMap.get("Furniture")!;
  for (const ins of inserts) {
    const moveX = decideMoveX(ins.x, ins.y, ptRight, ptLeft);
    const localGeom = blockDefs.get(ins.name) ?? [];
    const geom = flattenGeom(localGeom, ins.x, ins.y, ins.rotation);
    const entity: BlockEntity = {
      type: "block",
      name: ins.name,
      x: ins.x,
      y: ins.y,
      rotation: ins.rotation,
      moveX,
      geom,
    };
    furnitureLayer.entities.push(entity);
  }

  const name = filename.replace(/\.dxf$/i, "");
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return {
    id,
    name,
    baseWidth: Math.round(maxX),
    baseDepth: Math.round(maxY),
    minDelta: 0,
    maxDelta: Math.round(maxX * 0.5),
    layers: LAYER_ORDER.map((nm) => layerMap.get(nm)!).filter((l) => l.entities.length > 0),
  };
}

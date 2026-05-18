import type {
  FloorplanJSON,
  FloorplanLayer,
  PolylineEntity,
  BlockEntity,
  BlockGeom,
  GeomLine,
  GeomArc,
  GeomCircle,
  GeomPolyline,
  GeomSpline,
  Vertex,
} from "@/types/floorplan";

interface DxfPair {
  code: number;
  value: string;
}

function parsePairs(content: string): DxfPair[] {
  const lines = content.split(/\r?\n/);
  const pairs: DxfPair[] = [];
  for (let i = 0; i + 1 < lines.length; i += 2) {
    const code = parseInt(lines[i].trim(), 10);
    const value = lines[i + 1].trim();
    if (!isNaN(code)) pairs.push({ code, value });
  }
  return pairs;
}

function n(s: string) { return parseFloat(s) || 0; }

function isNear(ax: number, ay: number, bx: number, by: number, tol = 2) {
  return Math.abs(ax - bx) < tol && Math.abs(ay - by) < tol;
}

// ── Read a POLYLINE (with VERTEX subentities) starting after the POLYLINE pair ──
function readPolyline(pairs: DxfPair[], start: number): { closed: boolean; vertices: { x: number; y: number }[]; end: number } {
  let flags = 0;
  let j = start;
  while (j < pairs.length && pairs[j].code !== 0) {
    if (pairs[j].code === 70) flags = parseInt(pairs[j].value, 10);
    j++;
  }
  const vertices: { x: number; y: number }[] = [];
  while (j < pairs.length) {
    if (pairs[j].code === 0 && pairs[j].value === "VERTEX") {
      let k = j + 1, vx = 0, vy = 0, vflag = 0;
      while (k < pairs.length && pairs[k].code !== 0) {
        if (pairs[k].code === 10) vx = n(pairs[k].value);
        if (pairs[k].code === 20) vy = n(pairs[k].value);
        if (pairs[k].code === 70) vflag = parseInt(pairs[k].value, 10);
        k++;
      }
      if (!(vflag & 192)) vertices.push({ x: vx, y: vy });
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

// ── Extract geometry from a block definition ──
function readBlockGeom(pairs: DxfPair[], start: number): { geom: BlockGeom[]; end: number } {
  const geom: BlockGeom[] = [];
  let i = start;

  while (i < pairs.length) {
    const { code, value } = pairs[i];

    if (code === 0 && value === "ENDBLK") { i++; break; }
    if (code === 0 && value === "BLOCK") { i++; break; } // nested (shouldn't happen)

    if (code === 0 && value === "LINE") {
      let j = i + 1, x1 = 0, y1 = 0, x2 = 0, y2 = 0;
      while (j < pairs.length && pairs[j].code !== 0) {
        if (pairs[j].code === 10) x1 = n(pairs[j].value);
        if (pairs[j].code === 20) y1 = n(pairs[j].value);
        if (pairs[j].code === 11) x2 = n(pairs[j].value);
        if (pairs[j].code === 21) y2 = n(pairs[j].value);
        j++;
      }
      geom.push({ type: "line", x1, y1, x2, y2 } as GeomLine);
      i = j; continue;
    }

    if (code === 0 && value === "ARC") {
      let j = i + 1, cx = 0, cy = 0, r = 0, sa = 0, ea = 360;
      while (j < pairs.length && pairs[j].code !== 0) {
        if (pairs[j].code === 10) cx = n(pairs[j].value);
        if (pairs[j].code === 20) cy = n(pairs[j].value);
        if (pairs[j].code === 40) r = n(pairs[j].value);
        if (pairs[j].code === 50) sa = n(pairs[j].value);
        if (pairs[j].code === 51) ea = n(pairs[j].value);
        j++;
      }
      geom.push({ type: "arc", cx, cy, r, startAngle: sa, endAngle: ea } as GeomArc);
      i = j; continue;
    }

    if (code === 0 && value === "CIRCLE") {
      let j = i + 1, cx = 0, cy = 0, r = 0;
      while (j < pairs.length && pairs[j].code !== 0) {
        if (pairs[j].code === 10) cx = n(pairs[j].value);
        if (pairs[j].code === 20) cy = n(pairs[j].value);
        if (pairs[j].code === 40) r = n(pairs[j].value);
        j++;
      }
      geom.push({ type: "circle", cx, cy, r } as GeomCircle);
      i = j; continue;
    }

    if (code === 0 && value === "POLYLINE") {
      const { closed, vertices, end } = readPolyline(pairs, i + 1);
      if (vertices.length > 0)
        geom.push({ type: "polyline", closed, vertices } as GeomPolyline);
      i = end; continue;
    }

    if (code === 0 && value === "SPLINE") {
      // Collect fit points (code 11/21) or control points (code 10/20)
      let j = i + 1;
      const fitPts: { x: number; y: number }[] = [];
      const ctrlPts: { x: number; y: number }[] = [];
      let fx: number | null = null, fy: number | null = null;
      let cx: number | null = null, cy: number | null = null;
      while (j < pairs.length && pairs[j].code !== 0) {
        const c = pairs[j].code, v = pairs[j].value;
        if (c === 11) { fx = n(v); }
        if (c === 21) { if (fx !== null) { fitPts.push({ x: fx, y: n(v) }); fx = null; } }
        if (c === 10) { cx = n(v); }
        if (c === 20) { if (cx !== null) { ctrlPts.push({ x: cx, y: n(v) }); cx = null; } }
        j++;
      }
      const pts = fitPts.length > 0 ? fitPts : ctrlPts;
      if (pts.length > 1) geom.push({ type: "spline", points: pts } as GeomSpline);
      i = j; continue;
    }

    i++;
  }

  return { geom, end: i };
}

// ── Main parser ──
export function parseDxf(content: string, filename: string): FloorplanJSON {
  const pairs = parsePairs(content);

  const ptRight: { x: number; y: number }[] = [];
  const polylines: { layer: string; closed: boolean; vertices: { x: number; y: number }[] }[] = [];
  const inserts: { layer: string; name: string; x: number; y: number }[] = [];
  const blockDefs = new Map<string, BlockGeom[]>();

  let section = "";
  let i = 0;

  // ── Pass 1: BLOCKS section ──
  while (i < pairs.length) {
    const { code, value } = pairs[i];
    if (code === 2 && value === "BLOCKS") { section = "BLOCKS"; i++; continue; }
    if (code === 2 && value === "ENTITIES") { section = "ENTITIES"; i++; continue; }
    if (code === 0 && value === "ENDSEC") { section = ""; i++; continue; }

    if (section === "BLOCKS" && code === 0 && value === "BLOCK") {
      // find name (first code=2 after BLOCK)
      let j = i + 1, blockName = "";
      while (j < pairs.length && pairs[j].code !== 0) {
        if (pairs[j].code === 2) { blockName = pairs[j].value; break; }
        j++;
      }
      // skip to end of header (next code=0)
      while (j < pairs.length && pairs[j].code !== 0) j++;
      const { geom, end } = readBlockGeom(pairs, j);
      if (blockName && blockName !== "*Model_Space" && blockName !== "*Paper_Space")
        blockDefs.set(blockName, geom);
      i = end; continue;
    }

    if (section === "ENTITIES") {
      if (code === 0 && value === "POINT") {
        let j = i + 1, layer = "", px = 0, py = 0;
        while (j < pairs.length && pairs[j].code !== 0) {
          if (pairs[j].code === 8) layer = pairs[j].value;
          if (pairs[j].code === 10) px = n(pairs[j].value);
          if (pairs[j].code === 20) py = n(pairs[j].value);
          j++;
        }
        if (layer === "PT Rechtsboven") ptRight.push({ x: px, y: py });
        i = j; continue;
      }

      if (code === 0 && value === "POLYLINE") {
        let layer = "", flags = 0, j = i + 1;
        while (j < pairs.length && pairs[j].code !== 0) {
          if (pairs[j].code === 8) layer = pairs[j].value;
          if (pairs[j].code === 70) flags = parseInt(pairs[j].value, 10);
          j++;
        }
        const renderLayers = ["Walls", "Rooms", "Doors", "Windows"];
        if (renderLayers.includes(layer)) {
          const { closed, vertices, end } = readPolyline(pairs, j);
          polylines.push({ layer, closed: closed || !!(flags & 1), vertices });
          i = end; continue;
        }
        // skip non-render polylines
        const { end } = readPolyline(pairs, j);
        i = end; continue;
      }

      if (code === 0 && value === "INSERT") {
        let j = i + 1, layer = "", name = "", ix = 0, iy = 0;
        while (j < pairs.length && pairs[j].code !== 0) {
          if (pairs[j].code === 8) layer = pairs[j].value;
          if (pairs[j].code === 2) name = pairs[j].value;
          if (pairs[j].code === 10) ix = n(pairs[j].value);
          if (pairs[j].code === 20) iy = n(pairs[j].value);
          j++;
        }
        if (layer === "Furniture") inserts.push({ layer, name, x: ix, y: iy });
        i = j; continue;
      }
    }

    i++;
  }

  // ── Bounding box ──
  let maxX = 0, maxY = 0;
  for (const p of polylines) {
    for (const v of p.vertices) {
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
    }
  }

  // ── Assemble layers ──
  const layerOrder = ["Rooms", "Walls", "Doors", "Windows", "Furniture"];
  const layerMap = new Map<string, FloorplanLayer>();
  for (const name of layerOrder) layerMap.set(name, { name, entities: [] });

  for (const raw of polylines) {
    const layer = layerMap.get(raw.layer);
    if (!layer) continue;
    const vertices: Vertex[] = raw.vertices.map((v) => ({
      x: v.x,
      y: v.y,
      moveX: ptRight.some((pt) => isNear(pt.x, pt.y, v.x, v.y)),
    }));
    const entity: PolylineEntity = { type: "polyline", closed: raw.closed, vertices };
    layer.entities.push(entity);
  }

  const furnitureLayer = layerMap.get("Furniture")!;
  for (const ins of inserts) {
    const moveX = ptRight.some((pt) => isNear(pt.x, pt.y, ins.x, ins.y));
    const geom = blockDefs.get(ins.name) ?? [];
    const entity: BlockEntity = { type: "block", name: ins.name, x: ins.x, y: ins.y, moveX, geom };
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
    layers: layerOrder.map((nm) => layerMap.get(nm)!).filter((l) => l.entities.length > 0),
  };
}

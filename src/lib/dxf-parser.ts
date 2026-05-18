import type {
  FloorplanJSON,
  FloorplanLayer,
  PolylineEntity,
  BlockEntity,
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

interface RawPoint {
  x: number;
  y: number;
}

interface RawPolyline {
  layer: string;
  closed: boolean;
  vertices: RawPoint[];
}

interface RawInsert {
  layer: string;
  name: string;
  x: number;
  y: number;
}

interface RefRect {
  name: string;
  vertices: RawPoint[];
}

function isNear(a: RawPoint, b: RawPoint, tol = 2): boolean {
  return Math.abs(a.x - b.x) < tol && Math.abs(a.y - b.y) < tol;
}

function extractEntities(pairs: DxfPair[]) {
  const ptRight: RawPoint[] = [];
  const polylines: RawPolyline[] = [];
  const inserts: RawInsert[] = [];
  const blockRefs: RefRect[] = [];

  let inEntities = false;
  let inBlocks = false;
  let currentBlockName: string | null = null;
  let currentBlockPolyline: RawPoint[] | null = null;

  let i = 0;
  while (i < pairs.length) {
    const { code, value } = pairs[i];

    if (code === 2 && value === "ENTITIES") { inEntities = true; inBlocks = false; i++; continue; }
    if (code === 2 && value === "BLOCKS") { inBlocks = true; inEntities = false; i++; continue; }
    if (code === 0 && value === "ENDSEC") { inEntities = false; inBlocks = false; i++; continue; }

    // --- BLOCK definitions (for MeubelRefRec reference rectangles) ---
    if (inBlocks) {
      if (code === 0 && value === "BLOCK") {
        // find block name
        let j = i + 1;
        while (j < pairs.length && pairs[j].code !== 2) j++;
        currentBlockName = j < pairs.length ? pairs[j].value : null;
        currentBlockPolyline = null;
        i = j + 1;
        continue;
      }
      if (code === 0 && value === "ENDBLK") {
        currentBlockName = null;
        currentBlockPolyline = null;
        i++;
        continue;
      }
      if (code === 0 && value === "POLYLINE" && currentBlockName) {
        // check if layer is MeubelRefRec
        let j = i + 1;
        let layer = "";
        while (j < pairs.length && pairs[j].code !== 0) {
          if (pairs[j].code === 8) layer = pairs[j].value;
          j++;
        }
        if (layer === "MeubelRefRec") {
          currentBlockPolyline = [];
          blockRefs.push({ name: currentBlockName, vertices: currentBlockPolyline });
        } else {
          currentBlockPolyline = null;
        }
        i = j;
        continue;
      }
      if (code === 0 && value === "VERTEX" && currentBlockPolyline !== null) {
        let j = i + 1;
        let vx = 0, vy = 0;
        while (j < pairs.length && pairs[j].code !== 0) {
          if (pairs[j].code === 10) vx = parseFloat(pairs[j].value);
          if (pairs[j].code === 20) vy = parseFloat(pairs[j].value);
          j++;
        }
        // skip SEQEND-like sentinel vertices (flag 16 or other)
        const flagPair = pairs.slice(i + 1, j).find((p) => p.code === 70);
        const flag = flagPair ? parseInt(flagPair.value, 10) : 0;
        if (!(flag & 192)) currentBlockPolyline.push({ x: vx, y: vy });
        i = j;
        continue;
      }
      i++;
      continue;
    }

    // --- ENTITIES section ---
    if (!inEntities) { i++; continue; }

    if (code === 0 && value === "POINT") {
      let j = i + 1;
      let layer = "", px = 0, py = 0;
      while (j < pairs.length && pairs[j].code !== 0) {
        if (pairs[j].code === 8) layer = pairs[j].value;
        if (pairs[j].code === 10) px = parseFloat(pairs[j].value);
        if (pairs[j].code === 20) py = parseFloat(pairs[j].value);
        j++;
      }
      if (layer === "PT Rechtsboven") ptRight.push({ x: px, y: py });
      i = j;
      continue;
    }

    if (code === 0 && value === "POLYLINE") {
      let j = i + 1;
      let layer = "", flags = 0;
      while (j < pairs.length && pairs[j].code !== 0) {
        if (pairs[j].code === 8) layer = pairs[j].value;
        if (pairs[j].code === 70) flags = parseInt(pairs[j].value, 10);
        j++;
      }
      const renderLayers = ["Walls", "Rooms", "Doors", "Windows"];
      if (renderLayers.includes(layer)) {
        const poly: RawPolyline = { layer, closed: !!(flags & 1), vertices: [] };
        polylines.push(poly);
        // read VERTEX subentities
        while (j < pairs.length) {
          if (pairs[j].code === 0 && pairs[j].value === "VERTEX") {
            let k = j + 1;
            let vx = 0, vy = 0, vflag = 0;
            while (k < pairs.length && pairs[k].code !== 0) {
              if (pairs[k].code === 10) vx = parseFloat(pairs[k].value);
              if (pairs[k].code === 20) vy = parseFloat(pairs[k].value);
              if (pairs[k].code === 70) vflag = parseInt(pairs[k].value, 10);
              k++;
            }
            if (!(vflag & 192)) poly.vertices.push({ x: vx, y: vy });
            j = k;
          } else if (pairs[j].code === 0 && pairs[j].value === "SEQEND") {
            j++;
            break;
          } else if (pairs[j].code === 0) {
            break;
          } else {
            j++;
          }
        }
        i = j;
        continue;
      }
      i = j;
      continue;
    }

    if (code === 0 && value === "INSERT") {
      let j = i + 1;
      let layer = "", name = "", ix = 0, iy = 0;
      while (j < pairs.length && pairs[j].code !== 0) {
        if (pairs[j].code === 8) layer = pairs[j].value;
        if (pairs[j].code === 2) name = pairs[j].value;
        if (pairs[j].code === 10) ix = parseFloat(pairs[j].value);
        if (pairs[j].code === 20) iy = parseFloat(pairs[j].value);
        j++;
      }
      if (layer === "Furniture") inserts.push({ layer, name, x: ix, y: iy });
      i = j;
      continue;
    }

    i++;
  }

  return { ptRight, polylines, inserts, blockRefs };
}

export function parseDxf(content: string, filename: string): FloorplanJSON {
  const pairs = parsePairs(content);
  const { ptRight, polylines, inserts, blockRefs } = extractEntities(pairs);

  // Determine bounding box from all polyline vertices
  let maxX = 0, maxY = 0;
  for (const poly of polylines) {
    for (const v of poly.vertices) {
      if (v.x > maxX) maxX = v.x;
      if (v.y > maxY) maxY = v.y;
    }
  }

  const layerOrder = ["Rooms", "Walls", "Doors", "Windows", "Furniture"];
  const layerMap = new Map<string, FloorplanLayer>();
  for (const name of layerOrder) layerMap.set(name, { name, entities: [] });

  // Build polyline entities
  for (const raw of polylines) {
    const layer = layerMap.get(raw.layer);
    if (!layer) continue;
    const vertices: Vertex[] = raw.vertices.map((v) => ({
      x: v.x,
      y: v.y,
      moveX: ptRight.some((pt) => isNear(pt, v)),
    }));
    const entity: PolylineEntity = { type: "polyline", closed: raw.closed, vertices };
    layer.entities.push(entity);
  }

  // Build furniture INSERT entities
  const furnitureLayer = layerMap.get("Furniture")!;
  for (const ins of inserts) {
    const moveX = ptRight.some((pt) => isNear(pt, { x: ins.x, y: ins.y }));
    const ref = blockRefs.find((r) => r.name === ins.name);
    const refRect = ref ? ref.vertices : [
      { x: -200, y: -200 }, { x: 200, y: -200 },
      { x: 200, y: 200 }, { x: -200, y: 200 },
    ];
    const entity: BlockEntity = {
      type: "block",
      name: ins.name,
      x: ins.x,
      y: ins.y,
      moveX,
      refRect,
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
    layers: layerOrder.map((n) => layerMap.get(n)!).filter((l) => l.entities.length > 0),
  };
}

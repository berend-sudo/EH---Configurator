"use client";

import type {
  FloorplanJSON,
  FloorplanLayer,
  FloorplanEntity,
  BlockGeom,
  Vertex,
} from "@/types/floorplan";

interface Props {
  plan: FloorplanJSON;
  delta: number;
  width?: number;
  height?: number;
}

// ── Brand palette ─────────────────────────────────────────────────────────────
const WALL_COLOR  = "#003B2B";
const WIN_COLOR   = "#003B2B";
const FURN_COLOR  = "#001F17";
const DIM_COLOR   = "#003B2B";

// ── World → SVG transforms ────────────────────────────────────────────────────
function sxT(wx: number, moveX: boolean, delta: number, scale: number, padX: number) {
  return (moveX ? wx + delta : wx) * scale + padX;
}
function syT(wy: number, scale: number, drawH: number, padY: number) {
  return padY + drawH - wy * scale;
}

// ── Geometry utilities ────────────────────────────────────────────────────────
function applyDelta(verts: Vertex[], delta: number) {
  return verts.map(v => ({ x: v.x + (v.moveX ? delta : 0), y: v.y }));
}

function bboxOf(pts: { x: number; y: number }[]) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

function polygonAreaM2(verts: Vertex[], delta: number): number {
  const pts = applyDelta(verts, delta);
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    a += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(a) / 2 / 1_000_000;
}

function centroidSVG(
  verts: Vertex[], delta: number,
  scale: number, drawH: number, padX: number, padY: number,
) {
  let cx = 0, cy = 0;
  for (const v of verts) {
    cx += sxT(v.x, v.moveX, delta, scale, padX);
    cy += syT(v.y, scale, drawH, padY);
  }
  return { cx: cx / verts.length, cy: cy / verts.length };
}

// ── Room helpers ──────────────────────────────────────────────────────────────
function roomPatternId(layerName: string): string {
  const n = layerName.toLowerCase();
  if (n.includes("bath")) return "pat-bath";
  if (n.includes("terrace")) return "pat-terrace";
  return "pat-living";
}

function roomDisplayName(layerName: string): string {
  if (layerName.startsWith("Rooms - ")) return layerName.slice(8);
  return "Room";
}

// ── Spline path (Catmull-Rom) ─────────────────────────────────────────────────
function splinePath(
  pts: { x: number; y: number }[],
  moveX: boolean, delta: number,
  scale: number, drawH: number, padX: number, padY: number,
): string {
  if (pts.length < 2) return "";
  const px = (p: { x: number }) => sxT(p.x, moveX, delta, scale, padX);
  const py = (p: { y: number }) => syT(p.y, scale, drawH, padY);
  if (pts.length === 2) return `M ${px(pts[0])} ${py(pts[0])} L ${px(pts[1])} ${py(pts[1])}`;
  let d = `M ${px(pts[0])} ${py(pts[0])}`;
  for (let k = 0; k < pts.length - 1; k++) {
    const p0 = pts[Math.max(k - 1, 0)];
    const p1 = pts[k];
    const p2 = pts[k + 1];
    const p3 = pts[Math.min(k + 2, pts.length - 1)];
    const cp1x = px(p1) + (px(p2) - px(p0)) / 6;
    const cp1y = py(p1) + (py(p2) - py(p0)) / 6;
    const cp2x = px(p2) - (px(p3) - px(p1)) / 6;
    const cp2y = py(p2) - (py(p3) - py(p1)) / 6;
    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${px(p2)} ${py(p2)}`;
  }
  return d;
}

// ── Block geom renderer ───────────────────────────────────────────────────────
function renderGeom(
  g: BlockGeom,
  moveX: boolean, delta: number,
  scale: number, drawH: number, padX: number, padY: number,
  stroke: string, sw: number, key: string,
) {
  if (g.type === "polyline") {
    const pts = g.vertices
      .map(v => `${sxT(v.x, moveX, delta, scale, padX)},${syT(v.y, scale, drawH, padY)}`)
      .join(" ");
    return g.closed
      ? <polygon  key={key} points={pts} stroke={stroke} strokeWidth={sw} fill="none" />
      : <polyline key={key} points={pts} stroke={stroke} strokeWidth={sw} fill="none" />;
  }
  if (g.type === "spline") {
    return (
      <path key={key}
        d={splinePath(g.points, moveX, delta, scale, drawH, padX, padY)}
        stroke={stroke} strokeWidth={sw} fill="none" />
    );
  }
  return null;
}

// ── SVG pattern definitions ───────────────────────────────────────────────────
function RoomPatterns({
  scale, padX, padY, drawH,
}: {
  scale: number; padX: number; padY: number; drawH: number;
}) {
  const originY = padY + drawH; // world y=0 → this SVG y
  const liveH   = 150 * scale;
  const bathP   = 200 * scale;
  const tBoard  = 145 * scale;
  const tJoint  =   5 * scale;
  const terrH   = tBoard + tJoint;

  return (
    <defs>
      {/* Living Room / Bed Room / generic */}
      <pattern id="pat-living"
        x="0" y={originY} width="99999" height={liveH}
        patternUnits="userSpaceOnUse">
        <rect width="99999" height={liveH} fill="#F5ECD7" />
        <line x1="0" y1="0" x2="99999" y2="0" stroke="#8B7045" strokeWidth="0.5" />
      </pattern>

      {/* Bath Room — tile grid */}
      <pattern id="pat-bath"
        x={padX} y={originY} width={bathP} height={bathP}
        patternUnits="userSpaceOnUse">
        <rect width={bathP} height={bathP} fill="#E8F4F8" />
        <line x1="0" y1="0" x2={bathP} y2="0" stroke="#7AAABB" strokeWidth="0.5" />
        <line x1="0" y1="0" x2="0" y2={bathP} stroke="#7AAABB" strokeWidth="0.5" />
      </pattern>

      {/* Terrace — plank boards (145mm) with 5mm joint */}
      <pattern id="pat-terrace"
        x="0" y={originY} width="99999" height={terrH}
        patternUnits="userSpaceOnUse">
        <rect width="99999" height={tJoint} y="0" fill="#5A4A2A" />
        <rect width="99999" height={tBoard} y={tJoint} fill="#C8B080" />
      </pattern>
    </defs>
  );
}

// ── Layer-specific renderers ──────────────────────────────────────────────────

function renderRoom(
  entity: FloorplanEntity, layerName: string, key: string,
  delta: number, scale: number, drawH: number, padX: number, padY: number,
) {
  if (entity.type !== "polyline") return null;
  const pts = entity.vertices
    .map(v => `${sxT(v.x, v.moveX, delta, scale, padX)},${syT(v.y, scale, drawH, padY)}`)
    .join(" ");
  return (
    <polygon key={key} points={pts}
      fill={`url(#${roomPatternId(layerName)})`}
      stroke="#6B5A3A" strokeWidth={0.5} />
  );
}

function renderWall(
  entity: FloorplanEntity, key: string,
  delta: number, scale: number, drawH: number, padX: number, padY: number,
) {
  if (entity.type !== "polyline") return null;
  const pts = entity.vertices
    .map(v => `${sxT(v.x, v.moveX, delta, scale, padX)},${syT(v.y, scale, drawH, padY)}`)
    .join(" ");
  return entity.closed
    ? <polygon  key={key} points={pts} fill={WALL_COLOR} stroke={WALL_COLOR} strokeWidth={1} />
    : <polyline key={key} points={pts} fill="none"       stroke={WALL_COLOR} strokeWidth={1} />;
}

function renderWindow(
  entity: FloorplanEntity, key: string,
  delta: number, scale: number, drawH: number, padX: number, padY: number,
) {
  if (entity.type !== "polyline") return null;
  const pts = entity.vertices
    .map(v => `${sxT(v.x, v.moveX, delta, scale, padX)},${syT(v.y, scale, drawH, padY)}`)
    .join(" ");

  const worldPts = applyDelta(entity.vertices, delta);
  const b = bboxOf(worldPts);
  const off = 20 * scale; // 20mm gap from center in SVG pixels

  let l1x1: number, l1y1: number, l1x2: number, l1y2: number;
  let l2x1: number, l2y1: number, l2x2: number, l2y2: number;

  if (b.width >= b.height) {
    // Horizontal window — lines run along X, offset ±20mm in world Y
    const svgX1 = b.minX * scale + padX;
    const svgX2 = b.maxX * scale + padX;
    const svgCy = syT((b.minY + b.maxY) / 2, scale, drawH, padY);
    l1x1 = svgX1; l1y1 = svgCy - off; l1x2 = svgX2; l1y2 = svgCy - off;
    l2x1 = svgX1; l2y1 = svgCy + off; l2x2 = svgX2; l2y2 = svgCy + off;
  } else {
    // Vertical window — lines run along Y, offset ±20mm in world X
    const svgY1 = syT(b.maxY, scale, drawH, padY); // top in SVG (higher Y = smaller SVG y)
    const svgY2 = syT(b.minY, scale, drawH, padY); // bottom in SVG
    const svgCx = ((b.minX + b.maxX) / 2) * scale + padX;
    l1x1 = svgCx - off; l1y1 = svgY1; l1x2 = svgCx - off; l1y2 = svgY2;
    l2x1 = svgCx + off; l2y1 = svgY1; l2x2 = svgCx + off; l2y2 = svgY2;
  }

  return (
    <g key={key}>
      <polygon points={pts} fill="white" stroke="none" />
      <line x1={l1x1} y1={l1y1} x2={l1x2} y2={l1y2} stroke={WIN_COLOR} strokeWidth={1} />
      <line x1={l2x1} y1={l2y1} x2={l2x2} y2={l2y2} stroke={WIN_COLOR} strokeWidth={1} />
    </g>
  );
}

function renderDoor(
  entity: FloorplanEntity, key: string,
  delta: number, scale: number, drawH: number, padX: number, padY: number,
) {
  if (entity.type !== "polyline") return null;
  const pts = entity.vertices
    .map(v => `${sxT(v.x, v.moveX, delta, scale, padX)},${syT(v.y, scale, drawH, padY)}`)
    .join(" ");

  const b = bboxOf(applyDelta(entity.vertices, delta));
  const bgX = b.minX * scale + padX;
  const bgY = syT(b.maxY, scale, drawH, padY);
  const bgW = b.width  * scale;
  const bgH = b.height * scale;

  return (
    <g key={key}>
      <rect x={bgX} y={bgY} width={bgW} height={bgH} fill="white" stroke="none" />
      {entity.closed
        ? <polygon  points={pts} fill="none" stroke={WIN_COLOR} strokeWidth={1.5} />
        : <polyline points={pts} fill="none" stroke={WIN_COLOR} strokeWidth={1.5} />
      }
    </g>
  );
}

function renderFurniture(
  entity: FloorplanEntity, key: string,
  delta: number, scale: number, drawH: number, padX: number, padY: number,
) {
  if (entity.type !== "block") return null;
  const allPts: { x: number; y: number }[] = [];
  for (const g of entity.geom) {
    if (g.type === "polyline") allPts.push(...g.vertices);
    else if (g.type === "spline") allPts.push(...g.points);
  }
  if (allPts.length === 0) return null;

  const dx = entity.moveX ? delta : 0;
  const b = bboxOf(allPts.map(p => ({ x: p.x + dx, y: p.y })));
  const PAD = 1;
  const bgX = b.minX * scale + padX - PAD;
  const bgY = syT(b.maxY, scale, drawH, padY) - PAD;
  const bgW = b.width  * scale + PAD * 2;
  const bgH = b.height * scale + PAD * 2;

  return (
    <g key={key}>
      <rect x={bgX} y={bgY} width={bgW} height={bgH} fill="white" stroke="none" />
      {entity.geom.map((g, gi) =>
        renderGeom(g, entity.moveX, delta, scale, drawH, padX, padY,
          FURN_COLOR, 0.8, `${key}-${gi}`)
      )}
    </g>
  );
}

// ── Room labels ───────────────────────────────────────────────────────────────
function RoomLabels({
  layers, delta, scale, drawH, padX, padY,
}: {
  layers: FloorplanLayer[];
  delta: number; scale: number; drawH: number; padX: number; padY: number;
}) {
  const labels: React.ReactElement[] = [];

  for (const layer of layers) {
    const name = roomDisplayName(layer.name);
    for (let i = 0; i < layer.entities.length; i++) {
      const entity = layer.entities[i];
      if (entity.type !== "polyline" || !entity.closed || entity.vertices.length < 3) continue;

      const area  = polygonAreaM2(entity.vertices, delta);
      const { cx, cy } = centroidSVG(entity.vertices, delta, scale, drawH, padX, padY);
      const areaStr = area.toFixed(2) + " m²";
      const bgW = Math.max(name.length, areaStr.length) * 5.5 + 8;

      labels.push(
        <g key={`lbl-${layer.name}-${i}`}>
          <rect
            x={cx - bgW / 2} y={cy - 13} width={bgW} height={26}
            fill="white" fillOpacity={0.88} rx={2}
          />
          <text x={cx} y={cy - 3} textAnchor="middle"
            fontSize={8} fill={WALL_COLOR} fontFamily="sans-serif" fontWeight="600">
            {name}
          </text>
          <text x={cx} y={cy + 8} textAnchor="middle"
            fontSize={7.5} fill={WALL_COLOR} fontFamily="sans-serif">
            {areaStr}
          </text>
        </g>
      );
    }
  }

  return <>{labels}</>;
}

// ── Dimension lines ───────────────────────────────────────────────────────────
interface DimSeg { start: number; end: number }

function windowsOnWall(
  windowLayer: FloorplanLayer | undefined,
  wall: "top" | "bottom" | "left" | "right",
  totalWidth: number, baseDepth: number, delta: number,
): DimSeg[] {
  if (!windowLayer) return [];
  const THRESH = 200;
  const result: DimSeg[] = [];

  for (const e of windowLayer.entities) {
    if (e.type !== "polyline") continue;
    const pts = applyDelta(e.vertices, delta);
    const b = bboxOf(pts);
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;

    if (wall === "top"    && cy > baseDepth - THRESH)      result.push({ start: b.minX, end: b.maxX });
    if (wall === "bottom" && cy < THRESH)                  result.push({ start: b.minX, end: b.maxX });
    if (wall === "left"   && cx < THRESH)                  result.push({ start: b.minY, end: b.maxY });
    if (wall === "right"  && cx > totalWidth - THRESH)     result.push({ start: b.minY, end: b.maxY });
  }

  return result.sort((a, b) => a.start - b.start);
}

function buildChain(windows: DimSeg[], wallStart: number, wallEnd: number): DimSeg[] {
  const chain: DimSeg[] = [];
  let pos = wallStart;
  for (const w of windows) {
    if (w.start > pos + 1) chain.push({ start: pos, end: w.start });
    chain.push({ start: w.start, end: w.end });
    pos = w.end;
  }
  if (pos < wallEnd - 1) chain.push({ start: pos, end: wallEnd });
  return chain;
}

// Horizontal dimension line (top or bottom of building)
function HorizDim({
  chain, wallStart, wallEnd, svgY, scale, padX, above,
}: {
  chain: DimSeg[]; wallStart: number; wallEnd: number;
  svgY: number; scale: number; padX: number; above: boolean;
}) {
  if (chain.length === 0) return null;
  const xs = (w: number) => w * scale + padX;
  const TICK = 4;
  const textY = above ? svgY - 4 : svgY + 9;
  const MIN_LABEL = 250;

  // collect all unique tick x positions
  const ticks = new Set([xs(wallStart), xs(wallEnd)]);
  for (const s of chain) { ticks.add(xs(s.start)); ticks.add(xs(s.end)); }

  return (
    <g stroke={DIM_COLOR} strokeWidth={0.5} fill={DIM_COLOR} fontSize={7} fontFamily="sans-serif">
      <line x1={xs(wallStart)} y1={svgY} x2={xs(wallEnd)} y2={svgY} />
      {Array.from(ticks).map((x, i) => (
        <line key={i} x1={x} y1={svgY - TICK} x2={x} y2={svgY + TICK} />
      ))}
      {chain.map((seg, i) => {
        const len = Math.round(seg.end - seg.start);
        const cx = (xs(seg.start) + xs(seg.end)) / 2;
        return len >= MIN_LABEL ? (
          <text key={i} x={cx} y={textY} textAnchor="middle" stroke="none">{len}</text>
        ) : null;
      })}
    </g>
  );
}

// Vertical dimension line (left or right of building)
function VertDim({
  chain, wallStart, wallEnd, svgX, scale, drawH, padY, leftSide,
}: {
  chain: DimSeg[]; wallStart: number; wallEnd: number;
  svgX: number; scale: number; drawH: number; padY: number; leftSide: boolean;
}) {
  if (chain.length === 0) return null;
  // In SVG: higher world Y → smaller SVG y (because Y is flipped)
  const ys = (w: number) => padY + drawH - w * scale;
  const TICK = 4;
  const textX = leftSide ? svgX - 4 : svgX + 4;
  const anchor = leftSide ? "end" : "start";
  const MIN_LABEL = 250;

  const ticks = new Set([ys(wallStart), ys(wallEnd)]);
  for (const s of chain) { ticks.add(ys(s.start)); ticks.add(ys(s.end)); }

  return (
    <g stroke={DIM_COLOR} strokeWidth={0.5} fill={DIM_COLOR} fontSize={7} fontFamily="sans-serif">
      <line x1={svgX} y1={ys(wallStart)} x2={svgX} y2={ys(wallEnd)} />
      {Array.from(ticks).map((y, i) => (
        <line key={i} x1={svgX - TICK} y1={y} x2={svgX + TICK} y2={y} />
      ))}
      {chain.map((seg, i) => {
        const len = Math.round(seg.end - seg.start);
        const cy = (ys(seg.start) + ys(seg.end)) / 2;
        return len >= MIN_LABEL ? (
          <text key={i} x={textX} y={cy + 3} textAnchor={anchor} stroke="none">{len}</text>
        ) : null;
      })}
    </g>
  );
}

function DimensionLines({
  plan, delta, scale, drawH, padX, padY, windowLayer,
}: {
  plan: FloorplanJSON; delta: number; scale: number;
  drawH: number; padX: number; padY: number;
  windowLayer: FloorplanLayer | undefined;
}) {
  const totalWidth = plan.baseWidth + delta;
  const bLeft   = padX;
  const bRight  = padX + totalWidth     * scale;
  const bTop    = padY;
  const bBottom = padY + plan.baseDepth * scale;

  // Level 2 (inner, all 4 sides) at offset 30
  const topL2    = bTop    - 30;
  const bottomL2 = bBottom + 30;
  const leftL2   = bLeft   - 30;
  const rightL2  = bRight  + 30;

  // Level 1 (outer, top + left only) at offset 60
  const topL1  = bTop  - 60;
  const leftL1 = bLeft - 60;

  // Window chains
  const winTop    = windowsOnWall(windowLayer, "top",    totalWidth, plan.baseDepth, delta);
  const winBottom = windowsOnWall(windowLayer, "bottom", totalWidth, plan.baseDepth, delta);
  const winLeft   = windowsOnWall(windowLayer, "left",   totalWidth, plan.baseDepth, delta);
  const winRight  = windowsOnWall(windowLayer, "right",  totalWidth, plan.baseDepth, delta);

  const chainTop    = buildChain(winTop,    0, totalWidth);
  const chainBottom = buildChain(winBottom, 0, totalWidth);
  const chainLeft   = buildChain(winLeft,   0, plan.baseDepth);
  const chainRight  = buildChain(winRight,  0, plan.baseDepth);

  // Total chains for L1
  const chainTotalW: DimSeg[] = [{ start: 0, end: totalWidth }];
  const chainTotalH: DimSeg[] = [{ start: 0, end: plan.baseDepth }];

  // Extension lines: thin lines from building edge outward to just past outer dim line
  const extTop    = topL1    - 8;
  const extLeft   = leftL1   - 8;
  const extBottom = bottomL2 + 8;
  const extRight  = rightL2  + 8;

  return (
    <g>
      {/* Extension lines at building corners */}
      <g stroke={DIM_COLOR} strokeWidth={0.4} opacity={0.6}>
        {/* Top-left corner */}
        <line x1={bLeft}  y1={bTop}    x2={bLeft}  y2={extTop}  />
        {/* Top-right corner */}
        <line x1={bRight} y1={bTop}    x2={bRight} y2={extTop}  />
        {/* Bottom-left corner */}
        <line x1={bLeft}  y1={bBottom} x2={bLeft}  y2={extBottom} />
        {/* Bottom-right corner */}
        <line x1={bRight} y1={bBottom} x2={bRight} y2={extBottom} />
        {/* Top-left corner (vertical) */}
        <line x1={bLeft}  y1={bTop}    x2={extLeft}  y2={bTop}    />
        {/* Bottom-left corner (vertical) */}
        <line x1={bLeft}  y1={bBottom} x2={extLeft}  y2={bBottom} />
        {/* Top-right corner (vertical) */}
        <line x1={bRight} y1={bTop}    x2={extRight} y2={bTop}    />
        {/* Bottom-right corner (vertical) */}
        <line x1={bRight} y1={bBottom} x2={extRight} y2={bBottom} />
      </g>

      {/* Level 2 — all four sides */}
      <HorizDim chain={chainTop}    wallStart={0} wallEnd={totalWidth}
        svgY={topL2}    scale={scale} padX={padX} above={true}  />
      <HorizDim chain={chainBottom} wallStart={0} wallEnd={totalWidth}
        svgY={bottomL2} scale={scale} padX={padX} above={false} />
      <VertDim  chain={chainLeft}   wallStart={0} wallEnd={plan.baseDepth}
        svgX={leftL2}  scale={scale} drawH={drawH} padY={padY} leftSide={true}  />
      <VertDim  chain={chainRight}  wallStart={0} wallEnd={plan.baseDepth}
        svgX={rightL2} scale={scale} drawH={drawH} padY={padY} leftSide={false} />

      {/* Level 1 — top and left only */}
      <HorizDim chain={chainTotalW} wallStart={0} wallEnd={totalWidth}
        svgY={topL1}  scale={scale} padX={padX} above={true}  />
      <VertDim  chain={chainTotalH} wallStart={0} wallEnd={plan.baseDepth}
        svgX={leftL1} scale={scale} drawH={drawH} padY={padY} leftSide={true} />
    </g>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function FloorplanSVG({ plan, delta, width = 900, height = 720 }: Props) {
  const padX = 100, padY = 100;
  const drawW = width  - padX * 2;
  const drawH = height - padY * 2;

  const totalWidth = plan.baseWidth + delta;
  const scale = Math.min(drawW / totalWidth, drawH / plan.baseDepth);

  const windowLayer = plan.layers.find(l => l.name === "Windows");
  const roomLayers  = plan.layers.filter(l => l.name.startsWith("Rooms"));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="border border-stone-200 rounded-lg bg-white w-full"
      style={{ maxWidth: width }}
    >
      <RoomPatterns scale={scale} padX={padX} padY={padY} drawH={drawH} />

      {plan.layers.map(layer =>
        layer.entities.map((entity, idx) => {
          const key = `${layer.name}-${idx}`;
          if (layer.name.startsWith("Rooms"))    return renderRoom(entity, layer.name, key, delta, scale, drawH, padX, padY);
          if (layer.name === "Walls")             return renderWall(entity, key, delta, scale, drawH, padX, padY);
          if (layer.name === "Windows")           return renderWindow(entity, key, delta, scale, drawH, padX, padY);
          if (layer.name === "Doors")             return renderDoor(entity, key, delta, scale, drawH, padX, padY);
          if (layer.name === "Furniture")         return renderFurniture(entity, key, delta, scale, drawH, padX, padY);
          return null;
        })
      )}

      <RoomLabels
        layers={roomLayers} delta={delta} scale={scale}
        drawH={drawH} padX={padX} padY={padY}
      />

      <DimensionLines
        plan={plan} delta={delta} scale={scale}
        drawH={drawH} padX={padX} padY={padY}
        windowLayer={windowLayer}
      />
    </svg>
  );
}

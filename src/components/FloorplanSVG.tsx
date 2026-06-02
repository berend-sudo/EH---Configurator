"use client";

import type { FloorplanJSON, FloorplanEntity, BlockGeom, BlockEntity, PolylineEntity, Vertex } from "@/types/floorplan";

interface Props {
  plan: FloorplanJSON;
  delta: number;
  /** Pixels per millimetre — controls absolute viewBox size. */
  pxPerMm?: number;
  /** Show the mezzanine overlay + double-height annotation. Default true. */
  showMezzanine?: boolean;
}

// ── Coordinate helpers ────────────────────────────────────────────────────────
function sxT(worldX: number, scale: number, padX: number) {
  return worldX * scale + padX;
}
function syT(worldY: number, scale: number, drawH: number, padY: number) {
  return padY + drawH - worldY * scale;
}

const MAX_WINDOW_WIDTH_MM = 1800;

// World position of each window vertex, indexed by window-entity index within
// the "Windows" layer (polylines only). Attached wall/room vertices snap to
// these so they always track the window's (capped) edge.
type WindowPositions = Map<number, { x: number; y: number }[]>;

function buildWindowPositions(plan: FloorplanJSON, delta: number): WindowPositions {
  const map: WindowPositions = new Map();
  const windowLayer = plan.layers.find((l) => l.name === "Windows");
  if (!windowLayer) return map;

  let widx = 0;
  for (const entity of windowLayer.entities) {
    if (entity.type !== "polyline") continue;
    const verts = entity.vertices;
    let minX0 = Infinity, maxX0 = -Infinity;
    for (const v of verts) {
      if (v.x < minX0) minX0 = v.x;
      if (v.x > maxX0) maxX0 = v.x;
    }
    let leftMoves = false, rightMoves = false;
    for (const v of verts) {
      if (v.x === minX0 && v.moveX) leftMoves = true;
      if (v.x === maxX0 && v.moveX) rightMoves = true;
    }
    const w0 = maxX0 - minX0;
    let dxLeft = 0, dxRight = 0;
    if (leftMoves && rightMoves) {
      // Pure translation — no cap.
      dxLeft = delta;
      dxRight = delta;
    } else if (rightMoves) {
      // Stretches right; cap the right edge.
      dxRight = Math.min(delta, Math.max(0, MAX_WINDOW_WIDTH_MM - w0));
    } else if (leftMoves) {
      // Stretches left; cap the left edge.
      dxLeft = Math.min(delta, Math.max(0, MAX_WINDOW_WIDTH_MM - w0));
    }
    const positions = verts.map((v) => {
      const dx = v.x === minX0 ? dxLeft : v.x === maxX0 ? dxRight : 0;
      return { x: v.x + dx, y: v.y };
    });
    map.set(widx, positions);
    widx++;
  }
  return map;
}

function vertWorld(v: Vertex, delta: number, wp: WindowPositions): { x: number; y: number } {
  if (v.attach) {
    const pts = wp.get(v.attach.windowIdx);
    if (pts) {
      const p = pts[v.attach.vertexIdx];
      if (p) return p;
    }
  }
  return { x: v.x + (v.moveX ? delta : 0), y: v.y };
}

function applyDelta(verts: Vertex[], delta: number, wp: WindowPositions) {
  return verts.map((v) => vertWorld(v, delta, wp));
}

interface Pt { x: number; y: number }

function bboxOf(pts: Pt[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

function polygonAreaM2(verts: Vertex[], delta: number, wp: WindowPositions) {
  let a = 0;
  for (let i = 0; i < verts.length; i++) {
    const j = (i + 1) % verts.length;
    const pi = vertWorld(verts[i], delta, wp);
    const pj = vertWorld(verts[j], delta, wp);
    a += pi.x * pj.y - pj.x * pi.y;
  }
  return Math.abs(a) / 2 / 1_000_000;
}

function centroidSVG(
  verts: Vertex[],
  delta: number, scale: number, drawH: number, padX: number, padY: number,
  wp: WindowPositions,
) {
  const world = applyDelta(verts, delta, wp);
  const cx = world.reduce((s, v) => s + v.x, 0) / world.length;
  const cy = world.reduce((s, v) => s + v.y, 0) / world.length;
  return { x: sxT(cx, scale, padX), y: syT(cy, scale, drawH, padY) };
}

// ── Room type helpers ─────────────────────────────────────────────────────────
const WALL_THICKNESS = 94; // mm

function roomPatternId(layerName: string): string {
  if (layerName.includes("Bath")) return "pat-bath";
  if (layerName.includes("Terrace")) return "pat-terrace";
  return "pat-living";
}

function roomDisplayName(layerName: string): string {
  if (layerName === "Rooms") return "Room";
  return layerName.replace(/^Rooms\s*[$\-]\s*/, "");
}

// ── Catmull-Rom spline ────────────────────────────────────────────────────────
function splinePath(
  pts: Pt[],
  scale: number, drawH: number, padX: number, padY: number,
): string {
  if (pts.length < 2) return "";
  const px = (p: Pt) => sxT(p.x, scale, padX);
  const py = (p: Pt) => syT(p.y, scale, drawH, padY);
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

// ── Block geometry renderer ───────────────────────────────────────────────────
function renderGeom(
  g: BlockGeom,
  scale: number, drawH: number, padX: number, padY: number,
  stroke: string, strokeWidth: number, key: string,
): React.ReactNode {
  if (g.type === "polyline") {
    const pts = g.vertices.map(
      (v) => `${sxT(v.x, scale, padX)},${syT(v.y, scale, drawH, padY)}`
    ).join(" ");
    return g.closed
      ? <polygon  key={key} points={pts} stroke={stroke} strokeWidth={strokeWidth} fill="none" />
      : <polyline key={key} points={pts} stroke={stroke} strokeWidth={strokeWidth} fill="none" />;
  }
  if (g.type === "spline") {
    return (
      <path
        key={key}
        d={splinePath(g.points, scale, drawH, padX, padY)}
        stroke={stroke} strokeWidth={strokeWidth} fill="none"
      />
    );
  }
  if (g.type === "circle") {
    return (
      <circle
        key={key}
        cx={sxT(g.cx, scale, padX)}
        cy={syT(g.cy, scale, drawH, padY)}
        r={g.r * scale}
        stroke={stroke} strokeWidth={strokeWidth} fill="none"
      />
    );
  }
  return null;
}

// ── SVG <defs> patterns ───────────────────────────────────────────────────────
function RoomPatterns({
  scale, drawH, padY,
}: {
  scale: number; drawH: number; padY: number;
}) {
  // World y=0 is at SVG y = padY + drawH; align stripe origins there.
  const originY = padY + drawH;
  const livingPeriod = 150 * scale;
  const bathPeriod   = 200 * scale;
  const plankH       = 145 * scale;
  const jointH       =   5 * scale;
  const terracePeriod = plankH + jointH;

  return (
    <defs>
      {/* Living / Bed Room — warm wood horizontal lines */}
      <pattern id="pat-living" x="0" y={originY} width="10000" height={livingPeriod}
        patternUnits="userSpaceOnUse">
        <rect width="10000" height={livingPeriod} fill="#F5ECD7" />
        <line x1="0" y1={livingPeriod} x2="10000" y2={livingPeriod}
          stroke="#8B7045" strokeWidth="0.7" />
      </pattern>

      {/* Bath Room — blue tile grid */}
      <pattern id="pat-bath" x="0" y={originY} width={bathPeriod} height={bathPeriod}
        patternUnits="userSpaceOnUse">
        <rect width={bathPeriod} height={bathPeriod} fill="#E8F4F8" />
        <line x1={bathPeriod} y1="0" x2={bathPeriod} y2={bathPeriod}
          stroke="#7AAABB" strokeWidth="0.6" />
        <line x1="0" y1={bathPeriod} x2={bathPeriod} y2={bathPeriod}
          stroke="#7AAABB" strokeWidth="0.6" />
      </pattern>

      {/* Terrace — darker plank bands */}
      <pattern id="pat-terrace" x="0" y={originY} width="10000" height={terracePeriod}
        patternUnits="userSpaceOnUse">
        <rect width="10000" height={plankH} fill="#D4C4A0" />
        <rect y={plankH} width="10000" height={jointH} fill="#6B5A3A" />
      </pattern>

      {/* Mezzanine — 45° diagonal hatch, derived tints of --eh-green-900 /
          --eh-green. ~15 cm period in world to match the reference cadence
          (viewBox is in scaled-mm: 0.1 SVG units per mm). */}
      <pattern id="pat-mezz" width={15} height={15} patternUnits="userSpaceOnUse"
        patternTransform="rotate(45)">
        <rect width={15} height={15} fill="rgba(77,204,122,0.07)" />
        <line x1="0" y1="0" x2="0" y2={15} stroke="rgba(0,59,43,0.13)" strokeWidth={0.9} />
      </pattern>
    </defs>
  );
}

// ── Layer renderers ───────────────────────────────────────────────────────────
function renderRoom(
  entity: PolylineEntity,
  layerName: string,
  delta: number, scale: number, drawH: number, padX: number, padY: number,
  key: string, wp: WindowPositions,
): React.ReactNode {
  const world = applyDelta(entity.vertices, delta, wp);
  const pts = world.map((v) => `${sxT(v.x, scale, padX)},${syT(v.y, scale, drawH, padY)}`).join(" ");
  const patId = roomPatternId(layerName);
  return (
    <polygon key={key} points={pts}
      fill={`url(#${patId})`} stroke="none" />
  );
}

function renderWall(
  entity: PolylineEntity,
  delta: number, scale: number, drawH: number, padX: number, padY: number,
  key: string, wp: WindowPositions,
): React.ReactNode {
  const world = applyDelta(entity.vertices, delta, wp);
  const pts = world.map((v) => `${sxT(v.x, scale, padX)},${syT(v.y, scale, drawH, padY)}`).join(" ");
  return entity.closed
    ? <polygon  key={key} points={pts} fill="#003B2B" stroke="#003B2B" strokeWidth={1} />
    : <polyline key={key} points={pts} fill="none"    stroke="#003B2B" strokeWidth={1} />;
}

function renderWindow(
  entity: PolylineEntity,
  windowIdx: number,
  scale: number, drawH: number, padX: number, padY: number,
  key: string, wp: WindowPositions,
): React.ReactNode {
  // Read the window's positions directly from windowPositions (authoritative).
  const world = wp.get(windowIdx) ?? entity.vertices.map((v) => ({ x: v.x, y: v.y }));
  const pts = world.map((v) => `${sxT(v.x, scale, padX)},${syT(v.y, scale, drawH, padY)}`).join(" ");
  const bb = bboxOf(world);
  const isHoriz = bb.w >= bb.h;

  // ±20mm from center in the short axis — convert to SVG pixels
  const off = 20 * scale;
  let line1: [number, number, number, number];
  let line2: [number, number, number, number];

  if (isHoriz) {
    const cy = syT((bb.minY + bb.maxY) / 2, scale, drawH, padY);
    const x1 = sxT(bb.minX, scale, padX), x2 = sxT(bb.maxX, scale, padX);
    line1 = [x1, cy - off, x2, cy - off];
    line2 = [x1, cy + off, x2, cy + off];
  } else {
    const cx = sxT((bb.minX + bb.maxX) / 2, scale, padX);
    const y1 = syT(bb.maxY, scale, drawH, padY), y2 = syT(bb.minY, scale, drawH, padY);
    line1 = [cx - off, y1, cx - off, y2];
    line2 = [cx + off, y1, cx + off, y2];
  }

  return (
    <g key={key}>
      <polygon points={pts} fill="white" stroke="#003B2B" strokeWidth={1} />
      <line x1={line1[0]} y1={line1[1]} x2={line1[2]} y2={line1[3]}
        stroke="#003B2B" strokeWidth={1} />
      <line x1={line2[0]} y1={line2[1]} x2={line2[2]} y2={line2[3]}
        stroke="#003B2B" strokeWidth={1} />
    </g>
  );
}

// A door polyline's first and last vertices both lie on the wall it cuts
// through (the swing arc starts on the wall, ends on the wall). Detect which
// bbox edge contains both endpoints — that's the wall edge.
function detectDoorWallEdge(
  world: Pt[], bb: ReturnType<typeof bboxOf>,
): "top" | "bottom" | "left" | "right" | null {
  if (world.length < 2) return null;
  const v0 = world[0];
  const vN = world[world.length - 1];
  const tol = 5; // mm
  if (Math.abs(v0.y - bb.maxY) < tol && Math.abs(vN.y - bb.maxY) < tol) return "top";
  if (Math.abs(v0.y - bb.minY) < tol && Math.abs(vN.y - bb.minY) < tol) return "bottom";
  if (Math.abs(v0.x - bb.minX) < tol && Math.abs(vN.x - bb.minX) < tol) return "left";
  if (Math.abs(v0.x - bb.maxX) < tol && Math.abs(vN.x - bb.maxX) < tol) return "right";
  return null;
}

function renderDoor(
  entity: PolylineEntity,
  delta: number, scale: number, drawH: number, padX: number, padY: number,
  planW: number, planD: number,
  key: string, wp: WindowPositions,
): React.ReactNode {
  const world = applyDelta(entity.vertices, delta, wp);
  const pts = world.map((v) => `${sxT(v.x, scale, padX)},${syT(v.y, scale, drawH, padY)}`).join(" ");
  const bb = bboxOf(world);

  const W = WALL_THICKNESS;
  // Wall edge from polyline endpoints; fall back to nearest building edge.
  let side = detectDoorWallEdge(world, bb);
  if (!side) {
    const cx = (bb.minX + bb.maxX) / 2;
    const cy = (bb.minY + bb.maxY) / 2;
    const dTop = planD - cy, dBottom = cy, dLeft = cx, dRight = planW - cx;
    const minD = Math.min(dTop, dBottom, dLeft, dRight);
    side = minD === dTop ? "top" : minD === dBottom ? "bottom" : minD === dLeft ? "left" : "right";
  }

  // White rect spans the door opening, centred on the wall and 94mm thick.
  let rx = 0, ry = 0, rw = 0, rh = 0;
  if (side === "top") {
    // bbox top edge (world y = bb.maxY) sits on the wall centreline
    rx = sxT(bb.minX, scale, padX);
    ry = syT(bb.maxY + W / 2, scale, drawH, padY);
    rw = bb.w * scale;
    rh = W * scale;
  } else if (side === "bottom") {
    rx = sxT(bb.minX, scale, padX);
    ry = syT(bb.minY + W / 2, scale, drawH, padY);
    rw = bb.w * scale;
    rh = W * scale;
  } else if (side === "left") {
    rx = sxT(bb.minX - W / 2, scale, padX);
    ry = syT(bb.maxY, scale, drawH, padY);
    rw = W * scale;
    rh = bb.h * scale;
  } else {
    rx = sxT(bb.maxX - W / 2, scale, padX);
    ry = syT(bb.maxY, scale, drawH, padY);
    rw = W * scale;
    rh = bb.h * scale;
  }

  return (
    <g key={key}>
      <rect x={rx} y={ry} width={rw} height={rh} fill="white" stroke="none" />
      {entity.closed
        ? <polygon  points={pts} fill="none" stroke="#003B2B" strokeWidth={1.2} />
        : <polyline points={pts} fill="none" stroke="#003B2B" strokeWidth={1.2} />}
    </g>
  );
}

function renderBlockBackground(
  entity: BlockEntity,
  delta: number, scale: number, drawH: number, padX: number, padY: number,
): React.ReactNode {
  if (!entity.tl || !entity.tr) return null;
  const { tl, tr, depthVec, moveX } = entity;
  const shift = moveX ? delta : 0;
  const corners = [
    { x: tl.x + shift,              y: tl.y },
    { x: tr.x + shift,              y: tr.y },
    { x: tr.x + depthVec.x + shift, y: tr.y + depthVec.y },
    { x: tl.x + depthVec.x + shift, y: tl.y + depthVec.y },
  ];
  const pts = corners
    .map((c) => `${sxT(c.x, scale, padX)},${syT(c.y, scale, drawH, padY)}`)
    .join(" ");
  return <polygon points={pts} fill="white" stroke="none" />;
}

function renderFurnitureBlock(
  entity: BlockEntity,
  delta: number, scale: number, drawH: number, padX: number, padY: number,
  key: string,
): React.ReactNode {
  // Block geom is in world coords without delta. Shift padX to apply moveX at render time.
  const sPadX = entity.moveX ? padX + delta * scale : padX;
  return (
    <g key={key}>
      {renderBlockBackground(entity, delta, scale, drawH, padX, padY)}
      {entity.geom.map((g, gi) =>
        renderGeom(g, scale, drawH, sPadX, padY, "#001F17", 0.8, `${key}-${gi}`)
      )}
    </g>
  );
}

function renderFurniturePolyline(
  entity: PolylineEntity,
  delta: number, scale: number, drawH: number, padX: number, padY: number,
  key: string, wp: WindowPositions,
): React.ReactNode {
  const world = applyDelta(entity.vertices, delta, wp);
  const pts = world.map((v) => `${sxT(v.x, scale, padX)},${syT(v.y, scale, drawH, padY)}`).join(" ");
  return entity.closed
    ? <polygon  key={key} points={pts} fill="white" stroke="#001F17" strokeWidth={0.8} />
    : <polyline key={key} points={pts} fill="none"  stroke="#001F17" strokeWidth={0.8} />;
}

// ── Room labels ───────────────────────────────────────────────────────────────
function RoomLabels({
  plan, delta, scale, drawH, padX, padY, wp, showMezzanine,
}: {
  plan: FloorplanJSON; delta: number; scale: number;
  drawH: number; padX: number; padY: number; wp: WindowPositions;
  showMezzanine: boolean;
}) {
  const labels: React.ReactNode[] = [];

  const hasMezz = plan.mezzanine != null && showMezzanine;

  for (const layer of plan.layers) {
    if (!layer.name.startsWith("Rooms")) continue;
    // Mezzanine is labelled by its own chip inside MezzanineOverlay.
    if (layer.name.includes("Mezzanine")) continue;
    const displayName = roomDisplayName(layer.name);
    const isLiving = layer.name.includes("Living");

    for (let i = 0; i < layer.entities.length; i++) {
      const entity = layer.entities[i];
      if (entity.type !== "polyline") continue;
      const area = polygonAreaM2(entity.vertices, delta, wp).toFixed(2);
      const { x: cx, y: cy } = centroidSVG(entity.vertices, delta, scale, drawH, padX, padY, wp);
      const fontSize = 10;
      const lineH = fontSize + 3;
      const line1 = displayName;
      const line2 = `${area} m²`;
      const approxW = Math.max(line1.length, line2.length) * 5.5 + 8;
      const bgH = lineH * 2 + 6;

      labels.push(
        <g key={`label-${layer.name}-${i}`}>
          <rect
            x={cx - approxW / 2} y={cy - bgH / 2}
            width={approxW} height={bgH}
            fill="white" fillOpacity={0.85} rx={2}
          />
          <text
            x={cx} y={cy - lineH / 2 + fontSize * 0.35}
            textAnchor="middle" fontSize={fontSize}
            fontFamily="sans-serif" fill="#003B2B" fontWeight="600"
          >
            {line1}
          </text>
          <text
            x={cx} y={cy + lineH / 2 + fontSize * 0.35}
            textAnchor="middle" fontSize={fontSize}
            fontFamily="sans-serif" fill="#003B2B"
          >
            {line2}
          </text>
          {isLiving && hasMezz && (
            <text
              x={cx} y={cy + bgH / 2 + fontSize}
              textAnchor="middle" fontSize={fontSize - 1}
              fontFamily="sans-serif" fill="#4A5C56" fontWeight="300"
              fontStyle="italic"
            >
              double-height
            </text>
          )}
        </g>
      );
    }
  }

  return <>{labels}</>;
}

// ── Mezzanine overlay ─────────────────────────────────────────────────────────
// Renders the "line of floor above" convention onto the ground-floor plan:
// hatch fill + dashed footprint + label chip. No furniture, no railing —
// the stair (when present) is a furniture block on its own layer.
function MezzanineOverlay({
  plan, delta, scale, drawH, padX, padY, wp, show,
}: {
  plan: FloorplanJSON; delta: number; scale: number;
  drawH: number; padX: number; padY: number; wp: WindowPositions;
  show: boolean;
}) {
  if (!show || !plan.mezzanine) return null;

  // Use the live polylines from the layer so moveX vertices track the width
  // slider (consistent with how rooms render).
  const layer = plan.layers.find((l) => l.name.includes("Mezzanine"));
  if (!layer) return null;

  const parts: React.ReactNode[] = [];
  let totalAreaM2 = 0;

  for (let i = 0; i < layer.entities.length; i++) {
    const entity = layer.entities[i];
    if (entity.type !== "polyline" || !entity.closed) continue;
    const world = applyDelta(entity.vertices, delta, wp);
    const pts = world
      .map((v) => `${sxT(v.x, scale, padX)},${syT(v.y, scale, drawH, padY)}`)
      .join(" ");
    totalAreaM2 += polygonAreaM2(entity.vertices, delta, wp);
    parts.push(
      <polygon
        key={`mezz-fill-${i}`}
        points={pts}
        fill="url(#pat-mezz)"
        stroke="none"
      />,
      <polygon
        key={`mezz-edge-${i}`}
        points={pts}
        fill="none"
        stroke="var(--eh-green-900)"
        strokeWidth={2.4}
        strokeDasharray="12 7"
        opacity={0.6}
      />,
    );
  }

  // Single label chip, centred on the union of footprint centroids. For a
  // small footprint, suppress the sub-line so the chip doesn't overflow.
  const chip = (() => {
    if (layer.entities.length === 0) return null;
    let cxSum = 0, cySum = 0, n = 0;
    let bbMin = { x: Infinity, y: Infinity }, bbMax = { x: -Infinity, y: -Infinity };
    for (const ent of layer.entities) {
      if (ent.type !== "polyline") continue;
      const world = applyDelta(ent.vertices, delta, wp);
      for (const v of world) {
        cxSum += v.x; cySum += v.y; n++;
        if (v.x < bbMin.x) bbMin.x = v.x;
        if (v.y < bbMin.y) bbMin.y = v.y;
        if (v.x > bbMax.x) bbMax.x = v.x;
        if (v.y > bbMax.y) bbMax.y = v.y;
      }
    }
    if (n === 0) return null;
    const cx = sxT(cxSum / n, scale, padX);
    const cy = syT(cySum / n, scale, drawH, padY);
    const footprintWSvg = (bbMax.x - bbMin.x) * scale;
    const footprintHSvg = (bbMax.y - bbMin.y) * scale;
    const compact = footprintWSvg < 180 || footprintHSvg < 70;
    const chipW = compact ? 100 : 150;
    const chipH = compact ? 26 : 48;
    return (
      <g key="mezz-chip">
        <rect
          x={cx - chipW / 2} y={cy - chipH / 2}
          width={chipW} height={chipH} rx={9}
          fill="rgba(255,255,255,0.86)"
          stroke="var(--eh-green-900)" strokeWidth={0.8}
        />
        <text
          x={cx} y={compact ? cy + 4 : cy - 4}
          textAnchor="middle" fontSize={12}
          fontFamily="sans-serif" fontWeight="600"
          fill="var(--eh-green-900)"
        >
          Mezzanine over
        </text>
        {!compact && (
          <text
            x={cx} y={cy + 12}
            textAnchor="middle" fontSize={10}
            fontFamily="sans-serif" fontWeight="300"
            fill="var(--eh-text-muted)"
          >
            {totalAreaM2.toFixed(1)} m² · open to living below
          </text>
        )}
      </g>
    );
  })();

  return <>{parts}{chip}</>;
}

// ── Dimension lines ───────────────────────────────────────────────────────────
const DIM_COLOR = "#003B2B";
const DIM_FONT  = 9;

function HorizDim({
  x1, x2, y, label, tickLen = 6,
}: { x1: number; x2: number; y: number; label: string; tickLen?: number }) {
  const mx = (x1 + x2) / 2;
  return (
    <g>
      <line x1={x1} y1={y} x2={x2} y2={y} stroke={DIM_COLOR} strokeWidth={0.7} />
      <line x1={x1} y1={y - tickLen} x2={x1} y2={y + tickLen} stroke={DIM_COLOR} strokeWidth={0.7} />
      <line x1={x2} y1={y - tickLen} x2={x2} y2={y + tickLen} stroke={DIM_COLOR} strokeWidth={0.7} />
      <text x={mx} y={y - 3} textAnchor="middle" fontSize={DIM_FONT}
        fontFamily="sans-serif" fill={DIM_COLOR}>{label}</text>
    </g>
  );
}

function VertDim({
  x, y1, y2, label, tickLen = 6, side = "left",
}: { x: number; y1: number; y2: number; label: string; tickLen?: number; side?: "left" | "right" }) {
  const my = (y1 + y2) / 2;
  const tx = side === "left" ? x - 8 : x + 8;
  return (
    <g>
      <line x1={x} y1={y1} x2={x} y2={y2} stroke={DIM_COLOR} strokeWidth={0.7} />
      <line x1={x - tickLen} y1={y1} x2={x + tickLen} y2={y1} stroke={DIM_COLOR} strokeWidth={0.7} />
      <line x1={x - tickLen} y1={y2} x2={x + tickLen} y2={y2} stroke={DIM_COLOR} strokeWidth={0.7} />
      <text x={tx} y={my} textAnchor="middle" fontSize={DIM_FONT}
        fontFamily="sans-serif" fill={DIM_COLOR}
        transform={`rotate(-90,${tx},${my})`}>{label}</text>
    </g>
  );
}

// Find windows near a given wall face, returning their intervals along the wall axis
function windowsOnWall(
  plan: FloorplanJSON,
  delta: number,
  wall: "top" | "bottom" | "left" | "right",
  wp: WindowPositions,
): Array<{ min: number; max: number }> {
  const windowLayer = plan.layers.find((l) => l.name === "Windows");
  if (!windowLayer) return [];
  const threshold = 200; // mm

  const intervals: Array<{ min: number; max: number }> = [];
  let widx = 0;
  for (const entity of windowLayer.entities) {
    if (entity.type !== "polyline") continue;
    const world = wp.get(widx++) ?? entity.vertices.map((v) => ({ x: v.x, y: v.y }));
    const bb = bboxOf(world);
    const cx = (bb.minX + bb.maxX) / 2;
    const cy = (bb.minY + bb.maxY) / 2;

    const depth = plan.baseDepth;
    const width = plan.baseWidth + delta;

    if (wall === "top"    && cy > depth - threshold) intervals.push({ min: bb.minX, max: bb.maxX });
    if (wall === "bottom" && cy < threshold)          intervals.push({ min: bb.minX, max: bb.maxX });
    if (wall === "left"   && cx < threshold)          intervals.push({ min: bb.minY, max: bb.maxY });
    if (wall === "right"  && cx > width - threshold)  intervals.push({ min: bb.minY, max: bb.maxY });
  }
  return intervals.sort((a, b) => a.min - b.min);
}

function buildChain(wallStart: number, wallEnd: number, intervals: Array<{ min: number; max: number }>) {
  const segs: Array<{ from: number; to: number }> = [];
  let cur = wallStart;
  for (const iv of intervals) {
    if (iv.min > cur) segs.push({ from: cur, to: iv.min });
    segs.push({ from: iv.min, to: iv.max });
    cur = iv.max;
  }
  if (cur < wallEnd) segs.push({ from: cur, to: wallEnd });
  return segs;
}

function DimensionLines({
  plan, delta, scale, drawH, padX, padY, wp,
}: {
  plan: FloorplanJSON; delta: number; scale: number;
  drawH: number; padX: number; padY: number; wp: WindowPositions;
}) {
  const bLeft   = padX;
  const bRight  = padX + (plan.baseWidth + delta) * scale;
  const bTop    = padY;
  const bBottom = padY + plan.baseDepth * scale;

  const outerOff = 60;
  const innerOff = 30;

  const totalW = Math.round(plan.baseWidth + delta);
  const totalD = Math.round(plan.baseDepth);

  // ── Level 1: overall (top + left only) ──────────────────────────────────
  const outerLines: React.ReactNode[] = [
    <HorizDim key="dim-w" x1={bLeft} x2={bRight} y={bTop - outerOff} label={`${totalW}`} />,
    <VertDim  key="dim-d" x={bLeft - outerOff} y1={bTop} y2={bBottom} label={`${totalD}`} />,
  ];

  // ── Level 2: window chains (all 4 sides) ─────────────────────────────────
  const innerLines: React.ReactNode[] = [];

  // Top wall — horizontal chain
  const topWins = windowsOnWall(plan, delta, "top", wp);
  const topChain = buildChain(0, plan.baseWidth + delta, topWins);
  for (let i = 0; i < topChain.length; i++) {
    const seg = topChain[i];
    const len = Math.round(seg.to - seg.from);
    if (len < 50) continue;
    const sx1 = sxT(seg.from, scale, padX);
    const sx2 = sxT(seg.to,   scale, padX);
    innerLines.push(
      <HorizDim key={`top-${i}`} x1={sx1} x2={sx2} y={bTop - innerOff}
        label={len >= 300 ? `${len}` : ""} />
    );
  }

  // Bottom wall — horizontal chain
  const botWins = windowsOnWall(plan, delta, "bottom", wp);
  const botChain = buildChain(0, plan.baseWidth + delta, botWins);
  for (let i = 0; i < botChain.length; i++) {
    const seg = botChain[i];
    const len = Math.round(seg.to - seg.from);
    if (len < 50) continue;
    const sx1 = sxT(seg.from, scale, padX);
    const sx2 = sxT(seg.to,   scale, padX);
    innerLines.push(
      <HorizDim key={`bot-${i}`} x1={sx1} x2={sx2} y={bBottom + innerOff}
        label={len >= 300 ? `${len}` : ""} tickLen={6} />
    );
  }

  // Left wall — vertical chain (Y axis in world is bottom→top; in SVG top→bottom)
  const leftWins = windowsOnWall(plan, delta, "left", wp);
  const leftChain = buildChain(0, plan.baseDepth, leftWins);
  for (let i = 0; i < leftChain.length; i++) {
    const seg = leftChain[i];
    const len = Math.round(seg.to - seg.from);
    if (len < 50) continue;
    // World y → SVG y is flipped
    const sy1 = syT(seg.to,   scale, drawH, padY);
    const sy2 = syT(seg.from, scale, drawH, padY);
    innerLines.push(
      <VertDim key={`left-${i}`} x={bLeft - innerOff} y1={sy1} y2={sy2}
        label={len >= 300 ? `${len}` : ""} />
    );
  }

  // Right wall — vertical chain
  const rightWins = windowsOnWall(plan, delta, "right", wp);
  const rightChain = buildChain(0, plan.baseDepth, rightWins);
  for (let i = 0; i < rightChain.length; i++) {
    const seg = rightChain[i];
    const len = Math.round(seg.to - seg.from);
    if (len < 50) continue;
    const sy1 = syT(seg.to,   scale, drawH, padY);
    const sy2 = syT(seg.from, scale, drawH, padY);
    innerLines.push(
      <VertDim key={`right-${i}`} x={bRight + innerOff} y1={sy1} y2={sy2}
        label={len >= 300 ? `${len}` : ""} side="right" />
    );
  }

  return <>{outerLines}{innerLines}</>;
}

// ── Main entity dispatcher ────────────────────────────────────────────────────
function renderEntity(
  entity: FloorplanEntity,
  layerName: string,
  windowIdx: number,
  delta: number, scale: number, drawH: number, padX: number, padY: number,
  planW: number, planD: number,
  key: string, wp: WindowPositions,
): React.ReactNode {
  if (layerName.startsWith("Rooms")) {
    // The mezzanine is rendered by MezzanineOverlay below — skip here so we
    // don't draw it twice (and so it doesn't carry the regular room fill).
    if (layerName.includes("Mezzanine")) return null;
    if (entity.type !== "polyline") return null;
    return renderRoom(entity, layerName, delta, scale, drawH, padX, padY, key, wp);
  }
  if (layerName === "Walls") {
    if (entity.type !== "polyline") return null;
    return renderWall(entity, delta, scale, drawH, padX, padY, key, wp);
  }
  if (layerName === "Windows") {
    if (entity.type !== "polyline") return null;
    return renderWindow(entity, windowIdx, scale, drawH, padX, padY, key, wp);
  }
  if (layerName === "Doors") {
    if (entity.type !== "polyline") return null;
    return renderDoor(entity, delta, scale, drawH, padX, padY, planW, planD, key, wp);
  }
  if (layerName === "Furniture") {
    if (entity.type === "block")    return renderFurnitureBlock(entity, delta, scale, drawH, padX, padY, key);
    if (entity.type === "polyline") return renderFurniturePolyline(entity, delta, scale, drawH, padX, padY, key, wp);
  }
  return null;
}

// ── Root component ────────────────────────────────────────────────────────────
export default function FloorplanSVG({ plan, delta, pxPerMm = 0.1, showMezzanine = true }: Props) {
  // Fixed mm→viewBox-px scale. ViewBox grows with delta so the building, dim
  // lines and labels all sit at consistent visual proportions. The SVG element
  // itself fills the container width via CSS, so the *displayed* px-per-mm
  // varies, but the layout stays correct.
  const scale = pxPerMm;
  const padX = 100;  // viewBox px
  const padY = 100;
  const totalWidth = plan.baseWidth + delta;

  const drawW = totalWidth * scale;
  const drawH = plan.baseDepth * scale;
  const svgW  = drawW + 2 * padX;
  const svgH  = drawH + 2 * padY;

  const wp = buildWindowPositions(plan, delta);

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      className="w-full"
      style={{ display: "block", maxHeight: "100%" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <RoomPatterns scale={scale} drawH={drawH} padY={padY} />

      {plan.layers.map((layer) => {
        // The Windows layer contains only polylines (by construction in dxf-parser),
        // so the layer-entity index equals the windowIdx used in buildWindowPositions.
        let widx = 0;
        return layer.entities.map((entity, idx) => {
          const wIdx = layer.name === "Windows" && entity.type === "polyline" ? widx++ : -1;
          return renderEntity(entity, layer.name, wIdx, delta, scale, drawH, padX, padY,
            totalWidth, plan.baseDepth, `${layer.name}-${idx}`, wp);
        });
      })}

      <MezzanineOverlay plan={plan} delta={delta} scale={scale} drawH={drawH} padX={padX} padY={padY} wp={wp} show={showMezzanine} />
      <RoomLabels plan={plan} delta={delta} scale={scale} drawH={drawH} padX={padX} padY={padY} wp={wp} showMezzanine={showMezzanine} />
      <DimensionLines plan={plan} delta={delta} scale={scale} drawH={drawH} padX={padX} padY={padY} wp={wp} />
    </svg>
  );
}

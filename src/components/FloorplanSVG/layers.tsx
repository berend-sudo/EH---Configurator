// Per-entity SVG render functions. Each takes a parsed entity plus the
// rendering context (delta, scale, padding) and returns ReactNode. Pure with
// respect to React (no hooks); pure with respect to geometry math
// (delegated to @/lib/floorplan/geometry).
//
// Extracted from FloorplanSVG.tsx in Phase C2 of the architecture cleanup.

import type {
  BlockGeom,
  BlockEntity,
  FloorplanEntity,
  PolylineEntity,
} from "@/types/floorplan";
import {
  sxT,
  syT,
  bboxOf,
  applyDelta,
  splinePath,
  roomPatternId,
  detectDoorWallEdge,
  WALL_THICKNESS_MM,
  type WindowPositions,
} from "@/lib/floorplan/geometry";

// ── Block geometry (polyline / spline / circle) ─────────────────────────────
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

// ── Rooms ────────────────────────────────────────────────────────────────────
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

// ── Walls ────────────────────────────────────────────────────────────────────
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

// ── Windows ──────────────────────────────────────────────────────────────────
function renderWindow(
  entity: PolylineEntity,
  windowIdx: number,
  scale: number, drawH: number, padX: number, padY: number,
  key: string, wp: WindowPositions,
): React.ReactNode {
  // Read positions directly from windowPositions (authoritative — already cap-aware).
  const world = wp.get(windowIdx) ?? entity.vertices.map((v) => ({ x: v.x, y: v.y }));
  const pts = world.map((v) => `${sxT(v.x, scale, padX)},${syT(v.y, scale, drawH, padY)}`).join(" ");
  const bb = bboxOf(world);
  const isHoriz = bb.w >= bb.h;

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

// ── Doors ────────────────────────────────────────────────────────────────────
function renderDoor(
  entity: PolylineEntity,
  delta: number, scale: number, drawH: number, padX: number, padY: number,
  planW: number, planD: number,
  key: string, wp: WindowPositions,
): React.ReactNode {
  const world = applyDelta(entity.vertices, delta, wp);
  const pts = world.map((v) => `${sxT(v.x, scale, padX)},${syT(v.y, scale, drawH, padY)}`).join(" ");
  const bb = bboxOf(world);

  const W = WALL_THICKNESS_MM;
  let side = detectDoorWallEdge(world, bb);
  if (!side) {
    const cx = (bb.minX + bb.maxX) / 2;
    const cy = (bb.minY + bb.maxY) / 2;
    const dTop = planD - cy, dBottom = cy, dLeft = cx, dRight = planW - cx;
    const minD = Math.min(dTop, dBottom, dLeft, dRight);
    side = minD === dTop ? "top" : minD === dBottom ? "bottom" : minD === dLeft ? "left" : "right";
  }

  let rx = 0, ry = 0, rw = 0, rh = 0;
  if (side === "top") {
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

// ── Furniture (block + polyline) ─────────────────────────────────────────────
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

// ── Top-level dispatcher ─────────────────────────────────────────────────────
export function renderEntity(
  entity: FloorplanEntity,
  layerName: string,
  windowIdx: number,
  delta: number, scale: number, drawH: number, padX: number, padY: number,
  planW: number, planD: number,
  key: string, wp: WindowPositions,
): React.ReactNode {
  if (layerName.startsWith("Rooms")) {
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

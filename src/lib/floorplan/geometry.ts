// Pure geometry helpers extracted from src/components/FloorplanSVG.tsx in
// Phase C1 of the architecture cleanup. No React, no JSX — everything in
// here is testable in isolation and reusable by future code paths (in
// particular, the unified geometry resolver planned for C3).
//
// World coordinates are in mm. SVG/screen coordinates are in viewBox px.

import type { FloorplanJSON, Vertex } from "@/types/floorplan";

// ── Constants ─────────────────────────────────────────────────────────────────
export const MAX_WINDOW_WIDTH_MM = 1800;
export const WALL_THICKNESS_MM = 94;

// ── Primitive types ───────────────────────────────────────────────────────────
export interface Pt {
  x: number;
  y: number;
}

// World position of each window vertex, indexed by window-entity index within
// the "Windows" layer (polylines only). Attached wall/room vertices snap to
// these so they always track the window's (capped) edge.
export type WindowPositions = Map<number, Pt[]>;

// ── World → SVG coordinate transforms ────────────────────────────────────────
export function sxT(worldX: number, scale: number, padX: number): number {
  return worldX * scale + padX;
}

export function syT(
  worldY: number,
  scale: number,
  drawH: number,
  padY: number,
): number {
  return padY + drawH - worldY * scale;
}

// ── Bounding box ──────────────────────────────────────────────────────────────
export interface Bbox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  w: number;
  h: number;
}

export function bboxOf(pts: Pt[]): Bbox {
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY, w: maxX - minX, h: maxY - minY };
}

// ── Window stretching with the 1.8 m cap ─────────────────────────────────────
export function buildWindowPositions(
  plan: FloorplanJSON,
  delta: number,
): WindowPositions {
  const map: WindowPositions = new Map();
  const windowLayer = plan.layers.find((l) => l.name === "Windows");
  if (!windowLayer) return map;

  let widx = 0;
  for (const entity of windowLayer.entities) {
    if (entity.type !== "polyline") continue;
    const verts = entity.vertices;
    let minX0 = Infinity,
      maxX0 = -Infinity;
    for (const v of verts) {
      if (v.x < minX0) minX0 = v.x;
      if (v.x > maxX0) maxX0 = v.x;
    }
    let leftMoves = false,
      rightMoves = false;
    for (const v of verts) {
      if (v.x === minX0 && v.moveX) leftMoves = true;
      if (v.x === maxX0 && v.moveX) rightMoves = true;
    }
    const w0 = maxX0 - minX0;
    let dxLeft = 0,
      dxRight = 0;
    if (leftMoves && rightMoves) {
      dxLeft = delta;
      dxRight = delta;
    } else if (rightMoves) {
      dxRight = Math.min(delta, Math.max(0, MAX_WINDOW_WIDTH_MM - w0));
    } else if (leftMoves) {
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

// ── Vertex resolution (delta + attach + cap) ─────────────────────────────────
export function vertWorld(
  v: Vertex,
  delta: number,
  wp: WindowPositions,
): Pt {
  if (v.attach) {
    const pts = wp.get(v.attach.windowIdx);
    if (pts) {
      const p = pts[v.attach.vertexIdx];
      if (p) return p;
    }
  }
  return { x: v.x + (v.moveX ? delta : 0), y: v.y };
}

export function applyDelta(
  verts: Vertex[],
  delta: number,
  wp: WindowPositions,
): Pt[] {
  return verts.map((v) => vertWorld(v, delta, wp));
}

// ── Polygon area (window-cap-aware) ──────────────────────────────────────────
export function polygonAreaM2(
  verts: Vertex[],
  delta: number,
  wp: WindowPositions,
): number {
  let a = 0;
  for (let i = 0; i < verts.length; i++) {
    const j = (i + 1) % verts.length;
    const pi = vertWorld(verts[i], delta, wp);
    const pj = vertWorld(verts[j], delta, wp);
    a += pi.x * pj.y - pj.x * pi.y;
  }
  return Math.abs(a) / 2 / 1_000_000;
}

// ── Centroid in SVG coords ───────────────────────────────────────────────────
export function centroidSVG(
  verts: Vertex[],
  delta: number,
  scale: number,
  drawH: number,
  padX: number,
  padY: number,
  wp: WindowPositions,
): Pt {
  const world = applyDelta(verts, delta, wp);
  const cx = world.reduce((s, v) => s + v.x, 0) / world.length;
  const cy = world.reduce((s, v) => s + v.y, 0) / world.length;
  return { x: sxT(cx, scale, padX), y: syT(cy, scale, drawH, padY) };
}

// ── Room layer classifiers ───────────────────────────────────────────────────
export function roomPatternId(layerName: string): string {
  if (layerName.includes("Bath")) return "pat-bath";
  if (layerName.includes("Terrace")) return "pat-terrace";
  return "pat-living";
}

export function roomDisplayName(layerName: string): string {
  if (layerName === "Rooms") return "Room";
  return layerName.replace(/^Rooms\s*[$\-]\s*/, "");
}

// ── Catmull-Rom spline → SVG path d-string ──────────────────────────────────
export function splinePath(
  pts: Pt[],
  scale: number,
  drawH: number,
  padX: number,
  padY: number,
): string {
  if (pts.length < 2) return "";
  const px = (p: Pt) => sxT(p.x, scale, padX);
  const py = (p: Pt) => syT(p.y, scale, drawH, padY);
  if (pts.length === 2)
    return `M ${px(pts[0])} ${py(pts[0])} L ${px(pts[1])} ${py(pts[1])}`;
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

// ── Door wall-edge detection ─────────────────────────────────────────────────
// A door polyline's first and last vertices both lie on the wall it cuts
// through (the swing arc starts on the wall, ends on the wall). Detect which
// bbox edge contains both endpoints — that's the wall edge.
export type WallSide = "top" | "bottom" | "left" | "right";

export function detectDoorWallEdge(
  world: Pt[],
  bb: Bbox,
): WallSide | null {
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

// ── Window intervals along a given wall ──────────────────────────────────────
export function windowsOnWall(
  plan: FloorplanJSON,
  delta: number,
  wall: WallSide,
  wp: WindowPositions,
): Array<{ min: number; max: number }> {
  const windowLayer = plan.layers.find((l) => l.name === "Windows");
  if (!windowLayer) return [];
  const threshold = 200; // mm

  const intervals: Array<{ min: number; max: number }> = [];
  let widx = 0;
  for (const entity of windowLayer.entities) {
    if (entity.type !== "polyline") continue;
    const world =
      wp.get(widx++) ?? entity.vertices.map((v) => ({ x: v.x, y: v.y }));
    const bb = bboxOf(world);
    const cx = (bb.minX + bb.maxX) / 2;
    const cy = (bb.minY + bb.maxY) / 2;

    const depth = plan.baseDepth;
    const width = plan.baseWidth + delta;

    if (wall === "top" && cy > depth - threshold) intervals.push({ min: bb.minX, max: bb.maxX });
    if (wall === "bottom" && cy < threshold) intervals.push({ min: bb.minX, max: bb.maxX });
    if (wall === "left" && cx < threshold) intervals.push({ min: bb.minY, max: bb.maxY });
    if (wall === "right" && cx > width - threshold) intervals.push({ min: bb.minY, max: bb.maxY });
  }
  return intervals.sort((a, b) => a.min - b.min);
}

// ── Dimension chain (wall split by window openings) ──────────────────────────
export function buildChain(
  wallStart: number,
  wallEnd: number,
  intervals: Array<{ min: number; max: number }>,
): Array<{ from: number; to: number }> {
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

import type { FloorPlanElement, WallElement } from "@/types/floorPlan";

export const GRID_MM = 610;
export const HALF_GRID_MM = 305;
export const CORNER_SNAP_MM = 200;
export const WALL_SNAP_MM = 100;

export function snapToGrid(mm: number, step = GRID_MM): number {
  return Math.round(mm / step) * step;
}

export function snapPoint(
  x: number,
  y: number,
  step = GRID_MM,
): readonly [number, number] {
  return [snapToGrid(x, step), snapToGrid(y, step)] as const;
}

export function distanceToSegment(
  p: readonly [number, number],
  a: readonly [number, number],
  b: readonly [number, number],
): { distance: number; t: number; projection: readonly [number, number] } {
  const [px, py] = p;
  const [ax, ay] = a;
  const [bx, by] = b;
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return {
      distance: Math.hypot(px - ax, py - ay),
      t: 0,
      projection: [ax, ay] as const,
    };
  }
  const tRaw = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  const t = Math.max(0, Math.min(1, tRaw));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return {
    distance: Math.hypot(px - projX, py - projY),
    t,
    projection: [projX, projY] as const,
  };
}

/**
 * Collect all wall corner points across the plan — both wall and
 * partition endpoints. Used for corner-snapping during drawing.
 */
export function collectCorners(
  elements: readonly FloorPlanElement[],
): ReadonlyArray<readonly [number, number]> {
  const corners: Array<readonly [number, number]> = [];
  for (const el of elements) {
    if (el.type === "wall" || el.type === "partition") {
      for (const p of el.points) corners.push(p);
    }
  }
  return corners;
}

/**
 * Snap a point to an existing corner if within `CORNER_SNAP_MM`,
 * otherwise snap to the grid. Returns `{ snapped, corner: true|false }`.
 */
export function snapToCornerOrGrid(
  x: number,
  y: number,
  elements: readonly FloorPlanElement[],
  step = GRID_MM,
): { point: readonly [number, number]; snappedToCorner: boolean } {
  const corners = collectCorners(elements);
  let best: { pt: readonly [number, number]; d: number } | null = null;
  for (const c of corners) {
    const d = Math.hypot(x - c[0], y - c[1]);
    if (d <= CORNER_SNAP_MM && (!best || d < best.d)) best = { pt: c, d };
  }
  if (best) return { point: best.pt, snappedToCorner: true };
  return { point: snapPoint(x, y, step), snappedToCorner: false };
}

/**
 * Lock a line endpoint to horizontal or vertical relative to its start,
 * whichever axis is the larger delta. For shift-drag wall drawing.
 */
export function axisLock(
  start: readonly [number, number],
  end: readonly [number, number],
): readonly [number, number] {
  const dx = Math.abs(end[0] - start[0]);
  const dy = Math.abs(end[1] - start[1]);
  if (dx >= dy) return [end[0], start[1]] as const;
  return [start[0], end[1]] as const;
}

/**
 * Find the nearest wall segment. Returns the wall, its projection of p
 * onto the segment, and the distance — or null if no wall is within
 * `maxDistanceMm`.
 */
export function nearestWall(
  p: readonly [number, number],
  elements: readonly FloorPlanElement[],
  maxDistanceMm: number,
): {
  wall: WallElement;
  projection: readonly [number, number];
  distance: number;
  t: number;
  segIndex: number;
} | null {
  let best: {
    wall: WallElement;
    projection: readonly [number, number];
    distance: number;
    t: number;
    segIndex: number;
  } | null = null;
  for (const el of elements) {
    if (el.type !== "wall" && el.type !== "partition") continue;
    const wall = el as WallElement;
    for (let i = 0; i < wall.points.length - 1; i += 1) {
      const res = distanceToSegment(p, wall.points[i], wall.points[i + 1]);
      if (res.distance <= maxDistanceMm && (!best || res.distance < best.distance)) {
        best = {
          wall,
          projection: res.projection,
          distance: res.distance,
          t: res.t,
          segIndex: i,
        };
      }
    }
  }
  return best;
}

/**
 * Snap a furniture top-left corner to a nearby wall edge. Checks each
 * of its four edges against all walls; if any edge is within
 * `WALL_SNAP_MM`, shift the whole rect so the edge aligns with the wall.
 */
export function snapFurnitureToWalls(
  xMm: number,
  yMm: number,
  widthMm: number,
  heightMm: number,
  elements: readonly FloorPlanElement[],
): { x: number; y: number } {
  let x = xMm;
  let y = yMm;
  const walls = elements.filter(
    (e): e is WallElement => e.type === "wall" || e.type === "partition",
  );
  if (walls.length === 0) return { x, y };

  const tryAxis = (axis: "x" | "y") => {
    // For each wall, check if any axis-aligned segment is close in the
    // perpendicular direction. We use a simple AABB projection heuristic.
    let bestDelta: number | null = null;
    for (const wall of walls) {
      for (let i = 0; i < wall.points.length - 1; i += 1) {
        const [ax, ay] = wall.points[i];
        const [bx, by] = wall.points[i + 1];
        const isHorizontal = Math.abs(ay - by) < 1;
        const isVertical = Math.abs(ax - bx) < 1;
        if (axis === "y" && isHorizontal) {
          const wy = ay;
          // Does furniture x-range overlap wall x-range?
          const overlap =
            Math.min(x + widthMm, Math.max(ax, bx)) -
            Math.max(x, Math.min(ax, bx));
          if (overlap <= 0) continue;
          const candidates = [wy - y, wy - (y + heightMm)];
          for (const d of candidates) {
            if (Math.abs(d) <= WALL_SNAP_MM && (bestDelta === null || Math.abs(d) < Math.abs(bestDelta))) {
              bestDelta = d;
            }
          }
        }
        if (axis === "x" && isVertical) {
          const wx = ax;
          const overlap =
            Math.min(y + heightMm, Math.max(ay, by)) -
            Math.max(y, Math.min(ay, by));
          if (overlap <= 0) continue;
          const candidates = [wx - x, wx - (x + widthMm)];
          for (const d of candidates) {
            if (Math.abs(d) <= WALL_SNAP_MM && (bestDelta === null || Math.abs(d) < Math.abs(bestDelta))) {
              bestDelta = d;
            }
          }
        }
      }
    }
    if (bestDelta !== null) {
      if (axis === "x") x += bestDelta;
      else y += bestDelta;
    }
  };

  tryAxis("x");
  tryAxis("y");
  return { x, y };
}

/** Ray-cast point-in-polygon. */
export function pointInPolygon(
  pt: readonly [number, number],
  polygon: ReadonlyArray<readonly [number, number]>,
): boolean {
  const [x, y] = pt;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Shoelace area in m² for a closed polygon in mm. */
export function polygonAreaM2(
  points: ReadonlyArray<readonly [number, number]>,
): number {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area) / 2 / 1_000_000;
}

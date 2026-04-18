import type {
  DimensionElement,
  FloorPlanElement,
  FloorPlanModel,
  RoomLabelElement,
  WallElement,
} from "@/types/floorPlan";
import { pointInPolygon, polygonAreaM2 } from "./snap";

export type DimensionMode = "off" | "exterior" | "all";

/**
 * Auto-derive dimensions (exterior + optional interior) and refresh
 * room-label `areaM2` values from the wall geometry. Returns the full
 * element list the renderer should draw, in z-order.
 *
 * Derived elements are flagged with IDs prefixed `auto-`. User-drawn
 * elements are untouched.
 */
export function deriveRenderLayers(
  model: FloorPlanModel,
  mode: DimensionMode = "exterior",
): FloorPlanElement[] {
  const out: FloorPlanElement[] = [];

  // Pass 1: update room-label areas from enclosing wall polygon.
  for (const el of model.elements) {
    if (el.type === "room-label") {
      const poly = enclosingPolygon([el.xMm, el.yMm], model.elements);
      if (poly) {
        out.push({
          ...el,
          areaM2: Math.round(polygonAreaM2(poly) * 10) / 10,
        } as RoomLabelElement);
        continue;
      }
    }
    out.push(el);
  }

  if (mode === "off") return out;

  // Exterior dims: bottom (width) + right (depth). Based on viewBox.
  const vb = model.viewBox;
  out.push({
    id: "auto-dim-width",
    type: "dimension",
    from: [0, vb.height],
    to: [vb.width, vb.height],
    label: `${Math.round(vb.width).toLocaleString()}`,
    offsetMm: 450,
  } as DimensionElement);
  out.push({
    id: "auto-dim-depth",
    type: "dimension",
    from: [vb.width, 0],
    to: [vb.width, vb.height],
    label: `${Math.round(vb.height).toLocaleString()}`,
    offsetMm: -450,
  } as DimensionElement);

  if (mode === "all") {
    // Interior dims: vertical partition x-positions along the bottom of
    // the building. Gives the reader per-zone widths.
    const xs = new Set<number>([0, vb.width]);
    for (const el of model.elements) {
      if (el.type !== "partition" && el.type !== "wall") continue;
      for (let i = 0; i < el.points.length - 1; i += 1) {
        const [ax] = el.points[i];
        const [bx, by] = el.points[i + 1];
        const [, ay] = el.points[i];
        const isVertical = Math.abs(ax - bx) < 1 && Math.abs(ay - by) > 500;
        if (isVertical) xs.add(Math.round(ax));
      }
    }
    const sortedXs = Array.from(xs).sort((a, b) => a - b);
    for (let i = 0; i < sortedXs.length - 1; i += 1) {
      const x1 = sortedXs[i];
      const x2 = sortedXs[i + 1];
      out.push({
        id: `auto-dim-x-${i}`,
        type: "dimension",
        from: [x1, vb.height],
        to: [x2, vb.height],
        label: `${Math.round(x2 - x1).toLocaleString()}`,
        offsetMm: 900,
      } as DimensionElement);
    }
  }

  return out;
}

/**
 * Find the smallest wall-enclosing polygon around a point by stepping
 * outward until walls bound the point. Uses AABB expansion from wall
 * segments in the plan. Returns null if the point is outside the plan.
 *
 * This is a heuristic — it picks up rectangular rooms accurately and
 * approximates irregular rooms by their bounding box.
 */
function enclosingPolygon(
  pt: readonly [number, number],
  elements: readonly FloorPlanElement[],
): ReadonlyArray<readonly [number, number]> | null {
  const walls = elements.filter(
    (e): e is WallElement => e.type === "wall" || e.type === "partition",
  );
  if (walls.length === 0) return null;

  // Collect unique vertical and horizontal line positions.
  const verts = new Set<number>();
  const horiz = new Set<number>();
  for (const w of walls) {
    for (let i = 0; i < w.points.length - 1; i += 1) {
      const [ax, ay] = w.points[i];
      const [bx, by] = w.points[i + 1];
      if (Math.abs(ax - bx) < 1) verts.add(ax);
      if (Math.abs(ay - by) < 1) horiz.add(ay);
    }
  }
  const vs = Array.from(verts).sort((a, b) => a - b);
  const hs = Array.from(horiz).sort((a, b) => a - b);
  const leftX = [...vs].reverse().find((v) => v < pt[0]);
  const rightX = vs.find((v) => v > pt[0]);
  const topY = [...hs].reverse().find((v) => v < pt[1]);
  const botY = hs.find((v) => v > pt[1]);
  if (leftX === undefined || rightX === undefined || topY === undefined || botY === undefined) {
    return null;
  }
  const poly: ReadonlyArray<readonly [number, number]> = [
    [leftX, topY],
    [rightX, topY],
    [rightX, botY],
    [leftX, botY],
  ];
  // Sanity check: point actually inside.
  if (!pointInPolygon(pt, poly)) return null;
  return poly;
}

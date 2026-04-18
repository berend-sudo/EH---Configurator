import type { FloorPlanElement } from "@/types/floorPlan";
import type { LayoutResult, ZoneLayout } from "./zoneLayout";

/**
 * Per-element behaviour when its zone stretches.
 *   "stretch" — linearly map x from [baseZone] to [newZone] (used for room
 *               fills, walls, partitions, windows — geometry that spans
 *               the zone).
 *   "shift"   — translate by the zone's xShift only (used for furniture
 *               so it doesn't deform).
 *   "center"  — keep the element's relative position at (center offset ÷
 *               baseWidth) within the new zone, preserving its own width
 *               (used for room labels).
 */
type Mode = "stretch" | "shift" | "center";

function modeFor(type: FloorPlanElement["type"]): Mode {
  switch (type) {
    case "furniture":
      return "shift";
    case "room-label":
      return "center";
    case "room-fill":
    case "wall":
    case "partition":
    case "window":
    case "door":
    case "dimension":
    default:
      return "stretch";
  }
}

/** Map a single x coordinate from base zone space into the new layout space. */
function mapX(x: number, layout: ZoneLayout, mode: Mode): number {
  switch (mode) {
    case "stretch": {
      const rel = layout.baseWidthMm > 0
        ? (x - layout.baseXStartMm) / layout.baseWidthMm
        : 0;
      return layout.xStartMm + rel * layout.widthMm;
    }
    case "shift":
      return x + layout.xShiftMm;
    case "center": {
      // Treat x as the element's anchor (label position). Keep its relative
      // position in the zone identical.
      const rel = layout.baseWidthMm > 0
        ? (x - layout.baseXStartMm) / layout.baseWidthMm
        : 0;
      return layout.xStartMm + rel * layout.widthMm;
    }
  }
}

/**
 * Apply the layout to an element. Elements without a zoneId are returned
 * unchanged (external wall, overall dimensions).
 */
export function transformElement(
  el: FloorPlanElement,
  layouts: LayoutResult,
): FloorPlanElement {
  if (!el.zoneId) return el;
  const layout = layouts.zones.find((z) => z.id === el.zoneId);
  if (!layout) return el;
  const mode = modeFor(el.type);

  switch (el.type) {
    case "wall":
    case "partition":
    case "room-fill":
    case "terrace":
      return {
        ...el,
        points: el.points.map(([x, y]) => [mapX(x, layout, mode), y] as const),
      };
    case "window":
      return {
        ...el,
        points: [
          [mapX(el.points[0][0], layout, mode), el.points[0][1]],
          [mapX(el.points[1][0], layout, mode), el.points[1][1]],
        ] as const,
      };
    case "door":
      return { ...el, hingeXMm: mapX(el.hingeXMm, layout, mode) };
    case "furniture":
      return { ...el, xMm: mapX(el.xMm, layout, mode) };
    case "room-label":
      return { ...el, xMm: mapX(el.xMm, layout, mode) };
    case "dimension":
      // Dimensions are zone-bound in principle but we don't ship any inside
      // a zone yet; pass through.
      return el;
  }
}

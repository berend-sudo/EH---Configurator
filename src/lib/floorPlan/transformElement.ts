import type { FloorPlanElement } from "@/types/floorPlan";
import type { LayoutResult, ZoneLayout } from "./zoneLayout";

/**
 * Per-element behaviour when its zone stretches.
 *   "stretch"      — linearly map x from [baseZone] to [newZone] (room fills,
 *                    spanning walls, windows — geometry that spans the zone).
 *   "shift"        — translate by the zone's LEFT-edge shift (xShiftMm). Used
 *                    for furniture anchored near the west/left wall.
 *   "anchor-right" — translate by the zone's RIGHT-edge shift (rightShiftMm).
 *                    Used for furniture and fills anchored near the east/right
 *                    wall (dining table, veranda, zone-boundary partitions).
 *   "center"       — keep the element's relative position within the zone
 *                    (room labels not in either explicit list).
 */
type Mode = "stretch" | "shift" | "anchor-right" | "center";

/**
 * Determine mode. Priority:
 *   1. Element id in zone's movingElementIds    → anchor-right
 *   2. Element id in zone's stretchingElementIds → stretch
 *   3. Fallback by element type
 */
function modeForElement(el: FloorPlanElement, layout: ZoneLayout): Mode {
  if (layout.movingElementIds.includes(el.id)) return "anchor-right";
  if (layout.stretchingElementIds.includes(el.id)) return "stretch";
  return fallbackMode(el.type);
}

function fallbackMode(type: FloorPlanElement["type"]): Mode {
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
    case "anchor-right":
      return x + layout.rightShiftMm;
    case "center": {
      const rel = layout.baseWidthMm > 0
        ? (x - layout.baseXStartMm) / layout.baseWidthMm
        : 0;
      return layout.xStartMm + rel * layout.widthMm;
    }
  }
}

/**
 * Apply the layout to an element. Elements without a zoneId are returned
 * unchanged (external wall, overall dimensions handled separately).
 */
export function transformElement(
  el: FloorPlanElement,
  layouts: LayoutResult,
): FloorPlanElement {
  if (!el.zoneId) return el;
  const layout = layouts.zones.find((z) => z.id === el.zoneId);
  if (!layout) return el;
  const mode = modeForElement(el, layout);

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
      return el;
  }
}

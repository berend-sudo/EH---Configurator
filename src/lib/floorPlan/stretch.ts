import type {
  DoorElement,
  FloorPlanElement,
  FloorPlanModel,
  FurnitureElement,
  RoomFillElement,
  RoomLabelElement,
  TerraceElement,
  WallElement,
  WindowElement,
  Zone,
} from "@/types/floorPlan";

/**
 * Compute new left/right X for each zone, absorbing the length delta
 * into zones in `order` sequence (order=1 stretches first), clamped to
 * each zone's [minWidthMm, maxWidthMm]. Residual delta that doesn't fit
 * the configured max widths silently spills into the lowest-order zone.
 */
export interface ZoneLayout {
  id: string;
  origXStart: number;
  origXEnd: number;
  newXStart: number;
  newXEnd: number;
  origWidth: number;
  newWidth: number;
}

export interface StretchResult {
  model: FloorPlanModel;
  lengthMm: number;
  zoneLayouts: ZoneLayout[];
  /** Total delta that could not be absorbed by any zone. Informational. */
  residualDeltaMm: number;
}

/**
 * Distribute the target length across zones and return a transformed model
 * whose elements have been shifted / scaled per zone. The model's viewBox
 * width is updated to reflect the new outer length.
 */
export function stretchFloorPlan(
  model: FloorPlanModel,
  targetLengthMm: number,
): StretchResult {
  const origInnerLen = model.baseLengthMm;
  const origOuterWidth = model.viewBox.width;
  const wallSlack = origOuterWidth - origInnerLen; // typically 2× wall thk
  const newOuterWidth = targetLengthMm + wallSlack;

  const delta = newOuterWidth - origOuterWidth;

  // Sort zones by order (1 first). Distribute delta.
  const byOrder = [...model.zones].sort((a, b) => a.order - b.order);
  const widths = new Map<string, number>(
    byOrder.map((z) => [z.id, z.xEndMm - z.xStartMm]),
  );

  let remaining = delta;
  for (const zone of byOrder) {
    const currentW = widths.get(zone.id)!;
    const maxAdd = zone.maxWidthMm - currentW;
    const maxSub = currentW - zone.minWidthMm;
    let add = remaining;
    if (add > maxAdd) add = maxAdd;
    if (add < -maxSub) add = -maxSub;
    widths.set(zone.id, currentW + add);
    remaining -= add;
  }

  // Whatever couldn't fit — tack onto the lowest-order (first) zone so
  // the plan still spans the full requested length visually.
  if (Math.abs(remaining) > 0.5 && byOrder.length > 0) {
    const first = byOrder[0];
    widths.set(first.id, widths.get(first.id)! + remaining);
    remaining = 0;
  }

  // Now rebuild zone layouts in spatial (x) order so new X runs align.
  const bySpatial = [...model.zones].sort((a, b) => a.xStartMm - b.xStartMm);
  const zoneLayouts: ZoneLayout[] = [];
  let runningX = 0;
  for (const zone of bySpatial) {
    const origWidth = zone.xEndMm - zone.xStartMm;
    const newWidth = widths.get(zone.id)!;
    zoneLayouts.push({
      id: zone.id,
      origXStart: zone.xStartMm,
      origXEnd: zone.xEndMm,
      newXStart: runningX,
      newXEnd: runningX + newWidth,
      origWidth,
      newWidth,
    });
    runningX += newWidth;
  }
  const layoutById = new Map(zoneLayouts.map((l) => [l.id, l]));

  // Build element-id lookup tables for moving / stretching flags.
  const movingByElement = new Map<string, Zone>();
  const stretchingByElement = new Map<string, Zone>();
  for (const zone of model.zones) {
    for (const id of zone.movingElementIds) movingByElement.set(id, zone);
    for (const id of zone.stretchingElementIds)
      stretchingByElement.set(id, zone);
  }

  // Helper: remap a single X within a zone or globally.
  const remapXZone = (x: number, layout: ZoneLayout, stretch: boolean) => {
    if (stretch) {
      const t = (x - layout.origXStart) / layout.origWidth;
      return layout.newXStart + t * layout.newWidth;
    }
    // Default: translate by delta of left edge.
    return x + (layout.newXStart - layout.origXStart);
  };

  // Remap X lying outside all zones (walls, absolute externals).
  // Use piecewise linear mapping: in [0, first.origXStart] → identity,
  // across zones linearly, beyond last → translate by total delta.
  const remapXGlobal = (x: number) => {
    if (bySpatial.length === 0) return x;
    const first = zoneLayouts[0];
    const last = zoneLayouts[zoneLayouts.length - 1];
    if (x <= first.origXStart) return x;
    if (x >= last.origXEnd) return x + (newOuterWidth - origOuterWidth);
    for (const l of zoneLayouts) {
      if (x >= l.origXStart && x <= l.origXEnd) {
        const t = (x - l.origXStart) / (l.origWidth || 1);
        return l.newXStart + t * l.newWidth;
      }
    }
    return x;
  };

  const mapPoint = (
    x: number,
    y: number,
    el: FloorPlanElement,
  ): [number, number] => {
    // Elements with no zone: use global piecewise remap.
    if (!el.zoneId) return [remapXGlobal(x), y];
    const layout = layoutById.get(el.zoneId);
    if (!layout) return [x, y];
    const stretch = stretchingByElement.has(el.id);
    const moving = movingByElement.has(el.id);
    // For stretching: piecewise scale across this zone.
    if (stretch) return [remapXZone(x, layout, true), y];
    // For moving: anchor to zone's right edge (translate by right-edge delta).
    if (moving) {
      return [x + (layout.newXEnd - layout.origXEnd), y];
    }
    // Default: anchor to zone's left edge (translate by left-edge delta).
    return [x + (layout.newXStart - layout.origXStart), y];
  };

  const newElements: FloorPlanElement[] = model.elements.map((el) => {
    switch (el.type) {
      case "wall":
      case "partition": {
        const w = el as WallElement;
        return {
          ...w,
          points: w.points.map(([x, y]) => mapPoint(x, y, w)),
        } as WallElement;
      }
      case "room-fill": {
        const r = el as RoomFillElement;
        return {
          ...r,
          points: r.points.map(([x, y]) => mapPoint(x, y, r)),
        } as RoomFillElement;
      }
      case "window": {
        const w = el as WindowElement;
        const [p1, p2] = w.points;
        return {
          ...w,
          points: [mapPoint(p1[0], p1[1], w), mapPoint(p2[0], p2[1], w)] as WindowElement["points"],
        };
      }
      case "door": {
        const d = el as DoorElement;
        const [nx] = mapPoint(d.hingeXMm, d.hingeYMm, d);
        return { ...d, hingeXMm: nx };
      }
      case "furniture": {
        const f = el as FurnitureElement;
        const [nx] = mapPoint(f.xMm, f.yMm, f);
        // Stretched furniture: scale width by zone scale.
        if (f.zoneId && stretchingByElement.has(f.id)) {
          const l = layoutById.get(f.zoneId);
          if (l) {
            const scale = l.newWidth / l.origWidth;
            return { ...f, xMm: nx, widthMm: f.widthMm * scale };
          }
        }
        return { ...f, xMm: nx };
      }
      case "room-label": {
        const lbl = el as RoomLabelElement;
        const [nx] = mapPoint(lbl.xMm, lbl.yMm, lbl);
        return { ...lbl, xMm: nx };
      }
      case "dimension": {
        // Overall-width dimension tracks the new outer length.
        if (el.id === "dim-overall-width") {
          return {
            ...el,
            to: [newOuterWidth, el.to[1]] as readonly [number, number],
            label: formatMm(targetLengthMm + wallSlack),
          };
        }
        return el;
      }
      default:
        return el;
    }
  });

  const newModel: FloorPlanModel = {
    ...model,
    baseLengthMm: targetLengthMm,
    elements: newElements,
    viewBox: { ...model.viewBox, width: newOuterWidth },
  };

  return {
    model: newModel,
    lengthMm: targetLengthMm,
    zoneLayouts,
    residualDeltaMm: remaining,
  };
}

function formatMm(mm: number): string {
  const rounded = Math.round(mm);
  return rounded.toLocaleString("en-US");
}

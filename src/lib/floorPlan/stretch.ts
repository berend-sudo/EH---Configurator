import type {
  DimensionElement,
  DoorElement,
  FloorPlanElement,
  FloorPlanModel,
  FurnitureElement,
  RoomFillElement,
  RoomLabelElement,
  WallElement,
  WindowElement,
  Zone,
} from "@/types/floorPlan";

/**
 * A zone after the target length has been applied: `xStartMm`/`xEndMm`
 * are the *new* boundaries, `baseStartMm`/`baseEndMm` the authored ones.
 */
export interface StretchedZone extends Zone {
  baseStartMm: number;
  baseEndMm: number;
  widthBaseMm: number;
  widthNewMm: number;
}

export interface StretchedFloorPlan {
  /** The source model (unmodified). */
  source: FloorPlanModel;
  /** Target structural length actually realised (clamped + snapped). */
  lengthMm: number;
  /** Outer envelope width for SVG at the new length. */
  outerWidthMm: number;
  /** Each zone with its resolved new boundary. */
  zones: readonly StretchedZone[];
  /** Elements transformed into the stretched space. */
  elements: readonly FloorPlanElement[];
  /** Scalar delta the renderer can expose (useful for debug panels). */
  deltaMm: number;
}

const WALL_THICKNESS_MM = 88;

/**
 * Compute the stretched floor plan for a target structural length.
 *
 * Algorithm:
 *   1. Snap the target length to the model's jump grid and clamp to
 *      [minLengthMm, maxLengthMm].
 *   2. Distribute the length delta (relative to `baseLengthMm`) across
 *      zones in priority order: zone with `order = 1` grows first until
 *      it hits its `maxWidthMm`; overflow spills to `order = 2`, etc.
 *      When the target is *shorter* than the base, zones shrink in
 *      reverse priority order (last-to-fill is first-to-shrink) down to
 *      `minWidthMm`.
 *   3. Each element is mapped into the stretched coordinate system via
 *      `transformX` which is piecewise-linear across the zone partition.
 *
 * Elements that fall entirely outside any zone (overall dimensions,
 * external wall envelope) have their x-coordinates transformed using the
 * end-to-end mapping so the envelope resizes with the length.
 */
export function stretchFloorPlan(
  source: FloorPlanModel,
  targetLengthMm: number,
): StretchedFloorPlan {
  const lengthMm = snapLength(source, targetLengthMm);
  const deltaMm = lengthMm - source.baseLengthMm;

  const baseZones = [...source.zones].sort((a, b) => a.xStartMm - b.xStartMm);
  const newWidths = distributeDelta(baseZones, deltaMm);

  let cursor = 0;
  const zones: StretchedZone[] = baseZones.map((z, i) => {
    const widthNewMm = newWidths[i];
    const xStartMm = cursor;
    const xEndMm = cursor + widthNewMm;
    cursor = xEndMm;
    return {
      ...z,
      baseStartMm: z.xStartMm,
      baseEndMm: z.xEndMm,
      widthBaseMm: z.xEndMm - z.xStartMm,
      widthNewMm,
      xStartMm,
      xEndMm,
    };
  });

  const transformX = makeXTransformer(zones);
  const elements = source.elements.map((el) => transformElement(el, transformX));

  return {
    source,
    lengthMm,
    outerWidthMm: cursor,
    zones,
    elements,
    deltaMm,
  };
}

export function snapLength(source: FloorPlanModel, targetMm: number): number {
  const jumps = Math.round(targetMm / source.jumpSizeMm);
  const snapped = jumps * source.jumpSizeMm;
  return Math.min(source.maxLengthMm, Math.max(source.minLengthMm, snapped));
}

/**
 * Allocate `deltaMm` across zones.
 *
 * For delta > 0: iterate zones in ascending `order` (1 = first), giving
 * each the minimum of (remaining delta, headroom = max − base) until the
 * delta is consumed. If every zone reaches its max, the leftover is
 * silently absorbed in the top-priority zone — in practice the snap/clamp
 * in `snapLength` prevents this since model max length is typically
 * equal to Σ(maxWidth).
 *
 * For delta < 0: iterate zones in descending `order` (highest first),
 * each absorbing min(|delta|, base − min).
 */
function distributeDelta(zones: readonly Zone[], deltaMm: number): number[] {
  const widths = zones.map((z) => z.xEndMm - z.xStartMm);
  if (deltaMm === 0) return widths;

  const byPriorityAsc = zones
    .map((z, i) => ({ i, order: z.order, min: z.minWidthMm, max: z.maxWidthMm }))
    .sort((a, b) => a.order - b.order);

  if (deltaMm > 0) {
    let remaining = deltaMm;
    for (const z of byPriorityAsc) {
      const headroom = Math.max(0, z.max - widths[z.i]);
      const take = Math.min(headroom, remaining);
      widths[z.i] += take;
      remaining -= take;
      if (remaining <= 0) break;
    }
    if (remaining > 0) {
      widths[byPriorityAsc[0].i] += remaining;
    }
  } else {
    let remaining = -deltaMm;
    const byPriorityDesc = [...byPriorityAsc].reverse();
    for (const z of byPriorityDesc) {
      const slack = Math.max(0, widths[z.i] - z.min);
      const take = Math.min(slack, remaining);
      widths[z.i] -= take;
      remaining -= take;
      if (remaining <= 0) break;
    }
    if (remaining > 0) {
      widths[byPriorityDesc[0].i] -= remaining;
    }
  }
  return widths;
}

type XTransformer = (x: number) => number;

function makeXTransformer(zones: readonly StretchedZone[]): XTransformer {
  return (x: number): number => {
    if (zones.length === 0) return x;
    // Before any zone → translate by the left-most zone's delta (zones
    // always start at xStartMm=0 in this project, so this is a no-op).
    if (x < zones[0].baseStartMm) return x + (zones[0].xStartMm - zones[0].baseStartMm);
    for (const z of zones) {
      if (x <= z.baseEndMm) {
        const ratio = z.widthBaseMm === 0 ? 0 : (x - z.baseStartMm) / z.widthBaseMm;
        return z.xStartMm + ratio * z.widthNewMm;
      }
    }
    // Past the last zone → shift by the cumulative envelope delta.
    const last = zones[zones.length - 1];
    return last.xEndMm + (x - last.baseEndMm);
  };
}

function transformElement(
  el: FloorPlanElement,
  tx: XTransformer,
): FloorPlanElement {
  switch (el.type) {
    case "wall":
    case "partition":
    case "room-fill":
      return { ...el, points: el.points.map(([x, y]) => [tx(x), y] as const) } as
        | WallElement
        | RoomFillElement;
    case "window":
      return {
        ...el,
        points: [
          [tx(el.points[0][0]), el.points[0][1]],
          [tx(el.points[1][0]), el.points[1][1]],
        ] as WindowElement["points"],
      };
    case "door":
      return { ...el, hingeXMm: tx(el.hingeXMm) } as DoorElement;
    case "furniture": {
      // Furniture keeps its width/height; we anchor by the centre-x so
      // items stay inside their zone rather than drifting with the edge.
      const centreBase = el.xMm + el.widthMm / 2;
      const centreNew = tx(centreBase);
      return { ...el, xMm: centreNew - el.widthMm / 2 } as FurnitureElement;
    }
    case "room-label":
      return { ...el, xMm: tx(el.xMm) } as RoomLabelElement;
    case "dimension": {
      const fromX = tx(el.from[0]);
      const toX = tx(el.to[0]);
      const newLabel = rebuildDimensionLabel(el, fromX, toX);
      return {
        ...el,
        from: [fromX, el.from[1]],
        to: [toX, el.to[1]],
        label: newLabel,
      } as DimensionElement;
    }
  }
}

/**
 * If the authored label looks like a mm measurement (numeric, possibly
 * comma-formatted), rebuild it from the stretched endpoints. Otherwise
 * leave the author's label untouched.
 */
function rebuildDimensionLabel(
  el: DimensionElement,
  fromX: number,
  toX: number,
): string {
  if (!/^[\d,\s]+$/.test(el.label)) return el.label;
  const dx = toX - fromX;
  const dy = el.to[1] - el.from[1];
  const len = Math.hypot(dx, dy);
  return Math.round(len).toLocaleString("en-US");
}

export const WALL_THK_MM = WALL_THICKNESS_MM;

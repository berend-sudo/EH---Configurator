import type { FloorPlanModel, Zone } from "@/types/floorPlan";

export interface ZoneLayout {
  id: string;
  order: number;
  /** Base (as-authored) boundaries for quick lookup. */
  baseXStartMm: number;
  baseXEndMm: number;
  baseWidthMm: number;
  /** New boundaries at the target length. */
  xStartMm: number;
  xEndMm: number;
  widthMm: number;
  /** Shift applied to this zone's xStart from its base position. */
  xShiftMm: number;
  /** Shift applied to this zone's xEnd from its base position (= right-edge delta). */
  rightShiftMm: number;
  /** Multiplicative horizontal scale for stretchable elements within the zone. */
  scaleX: number;
  /** Copied from zone definition — elements that translate with the right edge. */
  movingElementIds: ReadonlyArray<string>;
  /** Copied from zone definition — elements that scale proportionally within zone. */
  stretchingElementIds: ReadonlyArray<string>;
}

export interface LayoutOptions {
  /** Target outer length in mm. Will be clamped to the plan's zone capacity. */
  targetLengthMm: number;
}

export interface LayoutResult {
  /** Layouts in left-to-right order (not priority order). */
  zones: ZoneLayout[];
  /** Actual total length achieved (may be clamped below or above `target`). */
  totalLengthMm: number;
  /** Sum of zone min widths — smallest plan width the zones support. */
  minLengthMm: number;
  /** Sum of zone max widths — largest plan width the zones support. */
  maxLengthMm: number;
}

/**
 * Distribute a target length across the plan's zones.
 *
 * When growing past base: the zone with the lowest `order` (1 = first) fills
 * to its `maxWidthMm` before the next zone takes any excess. When shrinking
 * below base: zones reduce in reverse order (highest `order` first) down to
 * their `minWidthMm`.
 *
 * The result is clamped to the sum of min/max zone widths so the renderer
 * never produces an invalid layout.
 */
export function layoutZones(
  plan: FloorPlanModel,
  { targetLengthMm }: LayoutOptions,
): LayoutResult {
  const leftToRight = [...plan.zones].sort((a, b) => a.xStartMm - b.xStartMm);

  const baseWidths = leftToRight.map((z) => z.xEndMm - z.xStartMm);
  const baseTotal = baseWidths.reduce((a, b) => a + b, 0);
  const minTotal = leftToRight.reduce((sum, z) => sum + z.minWidthMm, 0);
  const maxTotal = leftToRight.reduce((sum, z) => sum + z.maxWidthMm, 0);

  const clampedTarget = clamp(targetLengthMm, minTotal, maxTotal);
  const widths = [...baseWidths];
  let delta = clampedTarget - baseTotal;

  if (delta > 0) {
    // Growing: fill zones in priority order (order=1 first, capped at max).
    const byPriority = leftToRight
      .map((z, i) => ({ z, i }))
      .sort((a, b) => a.z.order - b.z.order);
    for (const { z, i } of byPriority) {
      if (delta <= 0) break;
      const headroom = z.maxWidthMm - widths[i];
      const take = Math.min(delta, headroom);
      widths[i] += take;
      delta -= take;
    }
  } else if (delta < 0) {
    // Shrinking: reverse priority — highest order yields first.
    let shortage = -delta;
    const byPriorityDesc = leftToRight
      .map((z, i) => ({ z, i }))
      .sort((a, b) => b.z.order - a.z.order);
    for (const { z, i } of byPriorityDesc) {
      if (shortage <= 0) break;
      const headroom = widths[i] - z.minWidthMm;
      const take = Math.min(shortage, headroom);
      widths[i] -= take;
      shortage -= take;
    }
  }

  // Assemble layouts, walking left-to-right.
  let x = 0;
  const totalLength = widths.reduce((a, b) => a + b, 0);
  const layouts: ZoneLayout[] = leftToRight.map((z, i) => {
    const w = widths[i];
    const layout: ZoneLayout = {
      id: z.id,
      order: z.order,
      baseXStartMm: z.xStartMm,
      baseXEndMm: z.xEndMm,
      baseWidthMm: baseWidths[i],
      xStartMm: x,
      xEndMm: x + w,
      widthMm: w,
      xShiftMm: x - z.xStartMm,
      rightShiftMm: (x + w) - z.xEndMm,
      scaleX: baseWidths[i] > 0 ? w / baseWidths[i] : 1,
      movingElementIds: z.movingElementIds,
      stretchingElementIds: z.stretchingElementIds,
    };
    x += w;
    return layout;
  });

  return {
    zones: layouts,
    totalLengthMm: totalLength,
    minLengthMm: minTotal,
    maxLengthMm: maxTotal,
  };
}

/** Convenience lookup: zoneLayoutById(layouts, 'zone-living'). */
export function zoneLayoutById(
  result: LayoutResult,
  id: string,
): ZoneLayout | undefined {
  return result.zones.find((z) => z.id === id);
}

/** Convenience lookup for the raw zone definition. */
export function zoneById(plan: FloorPlanModel, id: string): Zone | undefined {
  return plan.zones.find((z) => z.id === id);
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

"use client";

import type { FloorPlanModel, Zone } from "@/types/floorPlan";
import { nextZoneId } from "@/lib/admin/editorState";

interface Props {
  model: FloorPlanModel;
  onUpdateModel: (m: FloorPlanModel) => void;
}

/**
 * Zone definition. User enters vertical cut-line x positions; we
 * auto-create zones between them. Each zone has editable order, min,
 * max, and auto-assignment to elements by x-position (in the
 * `onAutoAssign` button).
 */
export function ZonesPanel({ model, onUpdateModel }: Props) {
  const zones = [...model.zones].sort((a, b) => a.xStartMm - b.xStartMm);

  const addZone = () => {
    // Split at 1/3 point as a new default.
    const prevMax = zones.length > 0 ? Math.max(...zones.map((z) => z.xEndMm)) : 0;
    const start = prevMax;
    const end = model.viewBox.width;
    const mid = (start + end) / 2;
    const newZones: Zone[] = [
      ...zones.filter((z) => z.xEndMm <= start),
      {
        id: nextZoneId(zones),
        order: zones.length + 1,
        xStartMm: start,
        xEndMm: mid,
        minWidthMm: Math.max(610, Math.round((mid - start) * 0.7)),
        maxWidthMm: Math.round((mid - start) * 1.5),
        movingElementIds: [],
        stretchingElementIds: [],
      },
      {
        id: nextZoneId([
          ...zones,
          { id: nextZoneId(zones) } as Zone,
        ]),
        order: zones.length + 2,
        xStartMm: mid,
        xEndMm: end,
        minWidthMm: Math.max(610, Math.round((end - mid) * 0.7)),
        maxWidthMm: Math.round((end - mid) * 1.5),
        movingElementIds: [],
        stretchingElementIds: [],
      },
    ];
    onUpdateModel({ ...model, zones: newZones });
  };

  const updateZone = (id: string, patch: Partial<Zone>) => {
    onUpdateModel({
      ...model,
      zones: model.zones.map((z) => (z.id === id ? { ...z, ...patch } : z)),
    });
  };

  const removeZone = (id: string) => {
    onUpdateModel({
      ...model,
      zones: model.zones.filter((z) => z.id !== id),
      elements: model.elements.map((e) =>
        "zoneId" in e && e.zoneId === id ? { ...e, zoneId: undefined } : e,
      ),
    });
  };

  const autoAssign = () => {
    // Every element whose anchor x falls within a zone's [xStart, xEnd]
    // gets zoneId = that zone.
    const anchor = (el: FloorPlanModel["elements"][number]): number | null => {
      if (el.type === "wall" || el.type === "partition" || el.type === "room-fill" || el.type === "terrace") {
        return el.points.reduce((s, p) => s + p[0], 0) / el.points.length;
      }
      if (el.type === "window") return (el.points[0][0] + el.points[1][0]) / 2;
      if (el.type === "door") return el.hingeXMm;
      if (el.type === "furniture" || el.type === "room-label")
        return el.xMm + ("widthMm" in el ? el.widthMm / 2 : 0);
      if (el.type === "dimension") return (el.from[0] + el.to[0]) / 2;
      return null;
    };
    onUpdateModel({
      ...model,
      elements: model.elements.map((el) => {
        const x = anchor(el);
        if (x === null) return el;
        const hit = model.zones.find((z) => x >= z.xStartMm && x <= z.xEndMm);
        return { ...el, zoneId: hit?.id };
      }),
    });
  };

  return (
    <div className="space-y-2 rounded border border-eh-sage p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-eh-forest">Zones</h3>
        <div className="flex gap-1">
          <button
            onClick={addZone}
            className="rounded border border-eh-sage px-2 py-0.5 text-xs hover:bg-eh-sage"
          >
            + split
          </button>
          <button
            onClick={autoAssign}
            className="rounded border border-eh-sage px-2 py-0.5 text-xs hover:bg-eh-sage"
          >
            auto-assign
          </button>
        </div>
      </div>
      {zones.length === 0 && (
        <p className="text-xs text-eh-charcoal/60">
          No zones yet. "+ split" seeds two zones across the building width.
        </p>
      )}
      <div className="space-y-1">
        {zones.map((z) => (
          <div
            key={z.id}
            className="grid grid-cols-[auto_1fr_1fr_1fr_auto] items-center gap-1 rounded bg-eh-sage/30 p-2 text-xs"
          >
            <span className="font-mono">{z.id}</span>
            <label className="flex items-center gap-1">
              order
              <input
                type="number"
                value={z.order}
                onChange={(e) => updateZone(z.id, { order: Number(e.target.value) })}
                className="w-12 rounded border border-eh-sage px-1 text-right"
              />
            </label>
            <label className="flex items-center gap-1">
              min
              <input
                type="number"
                value={z.minWidthMm}
                onChange={(e) => updateZone(z.id, { minWidthMm: Number(e.target.value) })}
                className="w-16 rounded border border-eh-sage px-1 text-right"
              />
            </label>
            <label className="flex items-center gap-1">
              max
              <input
                type="number"
                value={z.maxWidthMm}
                onChange={(e) => updateZone(z.id, { maxWidthMm: Number(e.target.value) })}
                className="w-16 rounded border border-eh-sage px-1 text-right"
              />
            </label>
            <button
              onClick={() => removeZone(z.id)}
              className="rounded border border-red-300 px-1 text-xs text-red-700 hover:bg-red-50"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

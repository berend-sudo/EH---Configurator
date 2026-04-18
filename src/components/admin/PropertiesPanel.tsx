"use client";

import type {
  DoorElement,
  FloorPlanElement,
  FloorPlanModel,
  FurnitureElement,
  RoomLabelElement,
  TerraceElement,
  WallElement,
  WindowElement,
} from "@/types/floorPlan";
import { DOOR_WIDTHS, WINDOW_WIDTHS } from "@/lib/admin/furnitureLibrary";

interface Props {
  model: FloorPlanModel;
  selectedId: string | null;
  onUpdateModel: (model: FloorPlanModel) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

/** Editable mm-precision form for whichever element is selected. */
export function PropertiesPanel({
  model,
  selectedId,
  onUpdateModel,
  onDelete,
  onDuplicate,
}: Props) {
  const el = model.elements.find((e) => e.id === selectedId);
  if (!el) {
    return (
      <div className="rounded border border-eh-sage p-3 text-xs text-eh-charcoal/60">
        No element selected. Click an element in the canvas to edit it.
      </div>
    );
  }

  const update = (patch: Partial<FloorPlanElement>) => {
    onUpdateModel({
      ...model,
      elements: model.elements.map((e) =>
        e.id === el.id ? ({ ...e, ...patch } as FloorPlanElement) : e,
      ),
    });
  };

  const updateZone = (zoneId: string | undefined) => {
    onUpdateModel({
      ...model,
      elements: model.elements.map((e) =>
        e.id === el.id ? ({ ...e, zoneId } as FloorPlanElement) : e,
      ),
    });
  };

  return (
    <div className="space-y-3 rounded border border-eh-sage p-3 text-sm">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-eh-charcoal/60">{el.id}</span>
        <span className="rounded bg-eh-sage px-2 py-0.5 text-xs uppercase tracking-wide text-eh-forest">
          {el.type}
        </span>
      </div>

      {(el.type === "wall" || el.type === "partition") && (
        <WallForm el={el} update={update} />
      )}
      {el.type === "door" && <DoorForm el={el} update={update} />}
      {el.type === "window" && <WindowForm el={el} update={update} />}
      {el.type === "furniture" && <FurnitureForm el={el} update={update} model={model} />}
      {el.type === "room-label" && <RoomLabelForm el={el} update={update} />}
      {el.type === "terrace" && <TerraceForm el={el} update={update} />}

      {/* Zone assignment — available on any element */}
      {"zoneId" in el && (
        <label className="flex items-center justify-between gap-2 border-t border-eh-sage pt-2 text-xs">
          <span>Zone</span>
          <select
            className="rounded border border-eh-sage px-2 py-1"
            value={(el as { zoneId?: string }).zoneId ?? ""}
            onChange={(e) => updateZone(e.target.value || undefined)}
          >
            <option value="">— none —</option>
            {model.zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.id}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="flex gap-2 border-t border-eh-sage pt-2">
        <button
          className="rounded border border-eh-sage px-2 py-1 text-xs hover:bg-eh-sage"
          onClick={onDuplicate}
        >
          Duplicate
        </button>
        <button
          className="rounded border border-red-400 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
          onClick={onDelete}
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function MmNumber({
  label,
  value,
  onChange,
  step = 10,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: number;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span>{label}</span>
      <input
        type="number"
        step={step}
        value={Math.round(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-24 rounded border border-eh-sage px-2 py-1 text-right font-mono"
      />
    </label>
  );
}

function WallForm({
  el,
  update,
}: {
  el: WallElement;
  update: (patch: Partial<FloorPlanElement>) => void;
}) {
  const setPoint = (i: number, axis: 0 | 1, v: number) => {
    const newPoints = el.points.map((p, idx) => {
      if (idx !== i) return p;
      const next: [number, number] = [p[0], p[1]];
      next[axis] = v;
      return next as readonly [number, number];
    });
    update({ points: newPoints });
  };
  return (
    <div className="space-y-1">
      <label className="flex items-center justify-between gap-2 text-xs">
        <span>Type</span>
        <select
          className="rounded border border-eh-sage px-2 py-1"
          value={el.type}
          onChange={(e) => update({ type: e.target.value as "wall" | "partition", thicknessMm: e.target.value === "wall" ? 88 : 60 })}
        >
          <option value="wall">Exterior wall (88mm)</option>
          <option value="partition">Partition (60mm)</option>
        </select>
      </label>
      <MmNumber
        label="Thickness"
        value={el.thicknessMm ?? (el.type === "wall" ? 88 : 60)}
        onChange={(v) => update({ thicknessMm: v })}
        step={1}
      />
      {el.points.map((p, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 rounded bg-eh-sage/30 p-2">
          <div className="col-span-2 text-xs text-eh-charcoal/60">Point {i + 1}</div>
          <MmNumber label="x" value={p[0]} onChange={(v) => setPoint(i, 0, v)} />
          <MmNumber label="y" value={p[1]} onChange={(v) => setPoint(i, 1, v)} />
        </div>
      ))}
    </div>
  );
}

function DoorForm({
  el,
  update,
}: {
  el: DoorElement;
  update: (patch: Partial<FloorPlanElement>) => void;
}) {
  const flip = () => {
    const next: Record<DoorElement["swing"], DoorElement["swing"]> = {
      NE: "NW",
      NW: "NE",
      SE: "SW",
      SW: "SE",
    };
    update({ swing: next[el.swing] });
  };
  return (
    <div className="space-y-1">
      <MmNumber label="hinge x" value={el.hingeXMm} onChange={(v) => update({ hingeXMm: v })} />
      <MmNumber label="hinge y" value={el.hingeYMm} onChange={(v) => update({ hingeYMm: v })} />
      <label className="flex items-center justify-between gap-2 text-xs">
        <span>Width</span>
        <select
          className="rounded border border-eh-sage px-2 py-1"
          value={el.widthMm}
          onChange={(e) => update({ widthMm: Number(e.target.value) })}
        >
          {DOOR_WIDTHS.map((w) => (
            <option key={w.mm} value={w.mm}>
              {w.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center justify-between gap-2 text-xs">
        <span>Swing quadrant</span>
        <select
          className="rounded border border-eh-sage px-2 py-1"
          value={el.swing}
          onChange={(e) => update({ swing: e.target.value as DoorElement["swing"] })}
        >
          <option value="NE">NE (right + up)</option>
          <option value="NW">NW (left + up)</option>
          <option value="SE">SE (right + down)</option>
          <option value="SW">SW (left + down)</option>
        </select>
      </label>
      <button
        className="rounded border border-eh-sage px-2 py-1 text-xs hover:bg-eh-sage"
        onClick={flip}
      >
        Flip swing horizontally
      </button>
    </div>
  );
}

function WindowForm({
  el,
  update,
}: {
  el: WindowElement;
  update: (patch: Partial<FloorPlanElement>) => void;
}) {
  const currentWidth = Math.round(
    Math.hypot(el.points[1][0] - el.points[0][0], el.points[1][1] - el.points[0][1]),
  );
  const setWidth = (w: number) => {
    const [ax, ay] = el.points[0];
    const [bx, by] = el.points[1];
    const segLen = Math.hypot(bx - ax, by - ay) || 1;
    const ux = (bx - ax) / segLen;
    const uy = (by - ay) / segLen;
    const cx = (ax + bx) / 2;
    const cy = (ay + by) / 2;
    update({
      points: [
        [cx - (ux * w) / 2, cy - (uy * w) / 2],
        [cx + (ux * w) / 2, cy + (uy * w) / 2],
      ],
    });
  };
  return (
    <div className="space-y-1">
      <label className="flex items-center justify-between gap-2 text-xs">
        <span>Width (standard)</span>
        <select
          className="rounded border border-eh-sage px-2 py-1"
          value={currentWidth}
          onChange={(e) => setWidth(Number(e.target.value))}
        >
          {WINDOW_WIDTHS.map((w) => (
            <option key={w.mm} value={w.mm}>
              {w.label}
            </option>
          ))}
          <option value={currentWidth}>{currentWidth} mm (custom)</option>
        </select>
      </label>
      {el.points.map((p, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 rounded bg-eh-sage/30 p-2">
          <div className="col-span-2 text-xs text-eh-charcoal/60">End {i + 1}</div>
          <MmNumber
            label="x"
            value={p[0]}
            onChange={(v) => {
              const next: [readonly [number, number], readonly [number, number]] = [
                el.points[0],
                el.points[1],
              ];
              next[i as 0 | 1] = [v, el.points[i as 0 | 1][1]] as const;
              update({ points: next });
            }}
          />
          <MmNumber
            label="y"
            value={p[1]}
            onChange={(v) => {
              const next: [readonly [number, number], readonly [number, number]] = [
                el.points[0],
                el.points[1],
              ];
              next[i as 0 | 1] = [el.points[i as 0 | 1][0], v] as const;
              update({ points: next });
            }}
          />
        </div>
      ))}
    </div>
  );
}

function FurnitureForm({
  el,
  update,
  model,
}: {
  el: FurnitureElement;
  update: (patch: Partial<FloorPlanElement>) => void;
  model: FloorPlanModel;
}) {
  const rotate = (step: number) => {
    update({ rotationDeg: ((el.rotationDeg ?? 0) + step + 360) % 360 });
  };
  const walls = model.elements.filter((e) => e.type === "wall" || e.type === "partition");
  return (
    <div className="space-y-1">
      <div className="text-xs text-eh-charcoal/60">
        {el.subtype} {el.isCustom ? "· custom rectangle" : "· library template"}
      </div>
      <MmNumber label="x (top-left)" value={el.xMm} onChange={(v) => update({ xMm: v })} />
      <MmNumber label="y (top-left)" value={el.yMm} onChange={(v) => update({ yMm: v })} />
      <MmNumber
        label="width"
        value={el.widthMm}
        onChange={(v) => el.isCustom && update({ widthMm: v })}
      />
      <MmNumber
        label="height"
        value={el.heightMm}
        onChange={(v) => el.isCustom && update({ heightMm: v })}
      />
      {!el.isCustom && (
        <div className="rounded bg-eh-sage/30 p-2 text-xs text-eh-charcoal/70">
          Library dimensions are fixed. Place a custom rectangle if you need
          a non-standard size.
        </div>
      )}
      <div className="flex gap-1">
        <button
          className="rounded border border-eh-sage px-2 py-1 text-xs"
          onClick={() => rotate(-90)}
        >
          ↺ 90°
        </button>
        <button
          className="rounded border border-eh-sage px-2 py-1 text-xs"
          onClick={() => rotate(90)}
        >
          ↻ 90°
        </button>
        <span className="ml-2 self-center text-xs font-mono">
          {el.rotationDeg ?? 0}°
        </span>
      </div>
      <label className="flex items-center justify-between gap-2 text-xs">
        <span>Stretch behavior</span>
        <select
          className="rounded border border-eh-sage px-2 py-1"
          value={el.stretchBehavior ?? "wall-anchored"}
          onChange={(e) =>
            update({
              stretchBehavior: e.target.value as FurnitureElement["stretchBehavior"],
            })
          }
        >
          <option value="wall-anchored">Wall-anchored (default)</option>
          <option value="centered">Re-center in zone</option>
          <option value="proportional">Move with stretch</option>
        </select>
      </label>
      {el.stretchBehavior === "wall-anchored" && (
        <label className="flex items-center justify-between gap-2 text-xs">
          <span>Anchor wall</span>
          <select
            className="rounded border border-eh-sage px-2 py-1"
            value={el.anchorWallId ?? ""}
            onChange={(e) =>
              update({ anchorWallId: e.target.value || undefined })
            }
          >
            <option value="">— none —</option>
            {walls.map((w) => (
              <option key={w.id} value={w.id}>
                {w.id}
              </option>
            ))}
          </select>
        </label>
      )}
    </div>
  );
}

function TerraceForm({
  el,
  update,
}: {
  el: TerraceElement;
  update: (patch: Partial<FloorPlanElement>) => void;
}) {
  const setPoint = (i: number, axis: 0 | 1, v: number) => {
    update({
      points: el.points.map((p, idx) => {
        if (idx !== i) return p;
        const next: [number, number] = [p[0], p[1]];
        next[axis] = v;
        return next as readonly [number, number];
      }),
    });
  };
  return (
    <div className="space-y-1">
      <label className="flex items-center justify-between gap-2 text-xs">
        <span>Kind</span>
        <select
          value={el.kind}
          onChange={(e) => update({ kind: e.target.value as TerraceElement["kind"] })}
          className="rounded border border-eh-sage px-2 py-1"
        >
          <option value="veranda">Veranda</option>
          <option value="pergola">Pergola</option>
        </select>
      </label>
      <label className="flex items-center justify-between gap-2 text-xs">
        <span>Railing</span>
        <select
          value={el.railing}
          onChange={(e) => update({ railing: e.target.value as TerraceElement["railing"] })}
          className="rounded border border-eh-sage px-2 py-1"
        >
          <option value="open">Open (vertical bars)</option>
          <option value="semi-closed">Semi-closed (horizontal boards)</option>
          <option value="none">None</option>
        </select>
      </label>
      <label className="flex items-center justify-between gap-2 text-xs">
        <span>Covered (under roof)</span>
        <input
          type="checkbox"
          checked={el.covered}
          onChange={(e) => update({ covered: e.target.checked })}
        />
      </label>
      <label className="flex items-center justify-between gap-2 text-xs">
        <span>Label</span>
        <input
          value={el.label ?? ""}
          onChange={(e) => update({ label: e.target.value || undefined })}
          className="w-32 rounded border border-eh-sage px-2 py-1"
        />
      </label>
      <div className="grid grid-cols-3 gap-1 text-xs">
        <label>
          A (1221)
          <input
            type="number"
            value={el.frameA ?? 0}
            onChange={(e) => update({ frameA: Number(e.target.value) })}
            className="w-full rounded border border-eh-sage px-1 text-right"
          />
        </label>
        <label>
          B (2442)
          <input
            type="number"
            value={el.frameB ?? 0}
            onChange={(e) => update({ frameB: Number(e.target.value) })}
            className="w-full rounded border border-eh-sage px-1 text-right"
          />
        </label>
        <label>
          C (3053)
          <input
            type="number"
            value={el.frameC ?? 0}
            onChange={(e) => update({ frameC: Number(e.target.value) })}
            className="w-full rounded border border-eh-sage px-1 text-right"
          />
        </label>
      </div>
      <MmNumber
        label="Railing m"
        value={el.railingM ?? 0}
        onChange={(v) => update({ railingM: v })}
        step={0.5}
      />
      {el.points.map((p, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 rounded bg-eh-sage/30 p-2">
          <div className="col-span-2 text-xs text-eh-charcoal/60">Corner {i + 1}</div>
          <MmNumber label="x" value={p[0]} onChange={(v) => setPoint(i, 0, v)} />
          <MmNumber label="y" value={p[1]} onChange={(v) => setPoint(i, 1, v)} />
        </div>
      ))}
    </div>
  );
}

function RoomLabelForm({
  el,
  update,
}: {
  el: RoomLabelElement;
  update: (patch: Partial<FloorPlanElement>) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="flex items-center justify-between gap-2 text-xs">
        <span>Name</span>
        <input
          className="w-40 rounded border border-eh-sage px-2 py-1"
          value={el.label}
          onChange={(e) => update({ label: e.target.value })}
        />
      </label>
      <MmNumber label="x" value={el.xMm} onChange={(v) => update({ xMm: v })} />
      <MmNumber label="y" value={el.yMm} onChange={(v) => update({ yMm: v })} />
      <div className="rounded bg-eh-sage/30 p-2 text-xs text-eh-charcoal/70">
        Area ({el.areaM2 ?? 0} m²) auto-derives from the enclosing walls.
      </div>
    </div>
  );
}

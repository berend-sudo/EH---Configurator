"use client";

import type { FloorPlanModel } from "@/types/floorPlan";
import { FURNITURE_LIBRARY } from "@/lib/admin/furnitureLibrary";
import { nextId } from "@/lib/admin/editorState";

interface Props {
  model: FloorPlanModel;
  onUpdateModel: (m: FloorPlanModel) => void;
}

/** Drag-and-drop furniture library — click to place at plan centre. */
export function FurniturePanel({ model, onUpdateModel }: Props) {
  const place = (tmplId: string) => {
    const t = FURNITURE_LIBRARY.find((x) => x.id === tmplId);
    if (!t) return;
    const cx = model.viewBox.width / 2;
    const cy = model.viewBox.height / 2;
    onUpdateModel({
      ...model,
      elements: [
        ...model.elements,
        {
          id: nextId("f", model.elements),
          type: "furniture",
          subtype: t.subtype,
          xMm: cx - t.widthMm / 2,
          yMm: cy - t.heightMm / 2,
          widthMm: t.widthMm,
          heightMm: t.heightMm,
          stretchBehavior: "wall-anchored",
          isCustom: false,
        },
      ],
    });
  };

  const placeCustom = () => {
    onUpdateModel({
      ...model,
      elements: [
        ...model.elements,
        {
          id: nextId("f", model.elements),
          type: "furniture",
          subtype: "generic",
          xMm: model.viewBox.width / 2 - 500,
          yMm: model.viewBox.height / 2 - 500,
          widthMm: 1000,
          heightMm: 1000,
          stretchBehavior: "wall-anchored",
          isCustom: true,
        },
      ],
    });
  };

  return (
    <div className="space-y-2 rounded border border-eh-sage p-3">
      <h3 className="text-sm font-semibold text-eh-forest">Furniture library</h3>
      <div className="grid grid-cols-2 gap-1">
        {FURNITURE_LIBRARY.map((t) => (
          <button
            key={t.id}
            onClick={() => place(t.id)}
            className="rounded border border-eh-sage px-2 py-1 text-left text-xs hover:bg-eh-sage"
            title={`${t.widthMm} × ${t.heightMm} mm`}
          >
            <div className="font-medium">{t.label}</div>
            <div className="font-mono text-[10px] text-eh-charcoal/60">
              {t.widthMm}×{t.heightMm}
            </div>
          </button>
        ))}
      </div>
      <button
        onClick={placeCustom}
        className="w-full rounded border border-dashed border-eh-sage px-2 py-1 text-left text-xs hover:bg-eh-sage"
      >
        + Custom rectangle (editable dimensions)
      </button>
    </div>
  );
}

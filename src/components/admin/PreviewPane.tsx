"use client";

import { useMemo } from "react";
import type { FloorPlanModel } from "@/types/floorPlan";
import { FloorPlanSVG } from "@/components/FloorPlanSVG";
import { LengthSlider } from "@/components/LengthSlider";
import { deriveRenderLayers, type DimensionMode } from "@/lib/admin/deriveLayers";
import { calculatePrice } from "@/lib/costEngine";
import { deriveAmounts } from "@/lib/floorPlan/deriveAmounts";
import type { CostInputs, FrameCounts } from "@/lib/admin/editorState";

interface Props {
  model: FloorPlanModel;
  lengthMm: number;
  onLengthMm: (n: number) => void;
  dimensionMode: DimensionMode;
  onDimensionMode: (m: DimensionMode) => void;
  showGrid: boolean;
  onShowGrid: (b: boolean) => void;
  frames: FrameCounts;
  costInputs: CostInputs;
}

const ugx = new Intl.NumberFormat("en-UG", {
  style: "currency",
  currency: "UGX",
  maximumFractionDigits: 0,
});

export function PreviewPane({
  model,
  lengthMm,
  onLengthMm,
  dimensionMode,
  onDimensionMode,
  showGrid,
  onShowGrid,
  frames,
  costInputs,
}: Props) {
  const previewModel = useMemo<FloorPlanModel>(
    () => ({ ...model, elements: deriveRenderLayers(model, dimensionMode) }),
    [model, dimensionMode],
  );

  const price = useMemo(() => {
    try {
      const derived = deriveAmounts({
        typology: model.typology,
        frames,
        partitionsM: costInputs.partitionsM,
        interiorDoors: costInputs.interiorDoors,
        aluminiumSqm: costInputs.aluminiumSqm,
        extraExtWallSteps: costInputs.extraExtWallSteps,
        bathrooms: model.bathrooms,
        depthMm: model.depthMm,
      });
      return calculatePrice({
        componentAmounts: derived.componentAmounts,
        gfaSqm: derived.gfaSqm,
      });
    } catch {
      return null;
    }
  }, [model.typology, model.bathrooms, model.depthMm, frames, costInputs]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1 text-xs">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => onShowGrid(e.target.checked)}
          />
          grid
        </label>
        <label className="flex items-center gap-1 text-xs">
          dims
          <select
            value={dimensionMode}
            onChange={(e) => onDimensionMode(e.target.value as DimensionMode)}
            className="rounded border border-eh-sage px-1 py-0.5 text-xs"
          >
            <option value="off">off</option>
            <option value="exterior">exterior</option>
            <option value="all">all</option>
          </select>
        </label>
      </div>

      <div className="rounded border border-eh-sage bg-white p-2">
        <FloorPlanSVG model={previewModel} lengthMm={lengthMm} showGrid={showGrid} />
      </div>

      <LengthSlider
        lengthMm={lengthMm}
        minLengthMm={model.minLengthMm + 176}
        maxLengthMm={model.maxLengthMm + 176}
        jumpSizeMm={model.jumpSizeMm}
        onChange={onLengthMm}
        label="Preview length"
      />

      {price ? (
        <dl className="grid grid-cols-2 gap-x-3 gap-y-1 rounded border border-eh-sage p-2 text-xs">
          <dt>Total incl. VAT</dt>
          <dd className="text-right font-mono font-semibold text-eh-forest">
            {ugx.format(price.priceUgxIncVatRounded)}
          </dd>
          <dt>Unrounded</dt>
          <dd className="text-right font-mono">{ugx.format(price.priceUgxIncVat)}</dd>
          <dt>Per m² GFA</dt>
          <dd className="text-right font-mono">{ugx.format(price.pricePerSqmUgxIncVat)}</dd>
          <dt>GFA</dt>
          <dd className="text-right font-mono">{price.gfaSqm.toFixed(1)} m²</dd>
        </dl>
      ) : (
        <p className="text-xs text-eh-charcoal/60">
          Set a valid frame combo in the metadata panel to see a live cost estimate.
        </p>
      )}
    </div>
  );
}

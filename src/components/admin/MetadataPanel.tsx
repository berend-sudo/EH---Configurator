"use client";

import type { FloorPlanModel } from "@/types/floorPlan";
import type { TypologyId } from "@/types/costEngine";
import type { CostInputs, FrameCounts } from "@/lib/admin/editorState";
import { TYPOLOGIES } from "@/lib/admin/editorState";

interface Props {
  model: FloorPlanModel;
  onUpdateModel: (m: FloorPlanModel) => void;
  frames: FrameCounts;
  onFrames: (f: FrameCounts) => void;
  costInputs: CostInputs;
  onCostInputs: (c: CostInputs) => void;
  verandaFrames: FrameCounts;
  onVerandaFrames: (f: FrameCounts) => void;
  railingM: number;
  onRailingM: (m: number) => void;
}

/**
 * Plan metadata + cost inputs. Frame counts feed the cost engine via
 * `deriveAmounts`; veranda frames + railing are separate admin inputs
 * not yet wired to the cost engine (tracked here so the exported JSON
 * captures them).
 */
export function MetadataPanel({
  model,
  onUpdateModel,
  frames,
  onFrames,
  costInputs,
  onCostInputs,
  verandaFrames,
  onVerandaFrames,
  railingM,
  onRailingM,
}: Props) {
  const set = <K extends keyof FloorPlanModel>(k: K, v: FloorPlanModel[K]) => {
    onUpdateModel({ ...model, [k]: v });
  };

  return (
    <div className="space-y-3 rounded border border-eh-sage p-3 text-sm">
      <h3 className="text-sm font-semibold text-eh-forest">Metadata</h3>

      <Row label="Model ID">
        <input
          value={model.id}
          onChange={(e) => set("id", e.target.value)}
          className="w-48 rounded border border-eh-sage px-2 py-1 font-mono text-xs"
        />
      </Row>
      <Row label="Name">
        <input
          value={model.name}
          onChange={(e) => set("name", e.target.value)}
          className="w-48 rounded border border-eh-sage px-2 py-1"
        />
      </Row>
      <Row label="Typology">
        <select
          value={model.typology}
          onChange={(e) => {
            const next = e.target.value as TypologyId;
            const t = TYPOLOGIES.find((x) => x.id === next);
            onUpdateModel({
              ...model,
              typology: next,
              depthMm: t?.depthMm ?? model.depthMm,
            });
          }}
          className="w-48 rounded border border-eh-sage px-2 py-1"
        >
          {TYPOLOGIES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
      </Row>
      <div className="grid grid-cols-2 gap-2">
        <NumRow label="Depth mm" value={model.depthMm} onChange={(v) => set("depthMm", v)} />
        <NumRow label="Bedrooms" value={model.bedrooms} onChange={(v) => set("bedrooms", v)} step={1} />
        <NumRow label="Bathrooms" value={model.bathrooms} onChange={(v) => set("bathrooms", v)} step={1} />
        <NumRow label="Base length mm" value={model.baseLengthMm} onChange={(v) => set("baseLengthMm", v)} step={10} />
        <NumRow label="Min length mm" value={model.minLengthMm} onChange={(v) => set("minLengthMm", v)} step={10} />
        <NumRow label="Max length mm" value={model.maxLengthMm} onChange={(v) => set("maxLengthMm", v)} step={10} />
      </div>

      <h3 className="pt-2 text-sm font-semibold text-eh-forest">Base frame config</h3>
      <div className="grid grid-cols-3 gap-2">
        <NumRow label="A (1221)" value={frames.A} onChange={(v) => onFrames({ ...frames, A: v })} step={1} />
        <NumRow label="B (2442)" value={frames.B} onChange={(v) => onFrames({ ...frames, B: v })} step={1} />
        <NumRow label="C (3053)" value={frames.C} onChange={(v) => onFrames({ ...frames, C: v })} step={1} />
      </div>

      <h3 className="pt-2 text-sm font-semibold text-eh-forest">Cost inputs</h3>
      <div className="grid grid-cols-2 gap-2">
        <NumRow
          label="Partitions m1"
          value={costInputs.partitionsM}
          onChange={(v) => onCostInputs({ ...costInputs, partitionsM: v })}
          step={0.5}
        />
        <NumRow
          label="Interior doors"
          value={costInputs.interiorDoors}
          onChange={(v) => onCostInputs({ ...costInputs, interiorDoors: v })}
          step={1}
        />
        <NumRow
          label="Aluminium sqm"
          value={costInputs.aluminiumSqm}
          onChange={(v) => onCostInputs({ ...costInputs, aluminiumSqm: v })}
          step={0.1}
        />
        <NumRow
          label="Extra ext-wall steps"
          value={costInputs.extraExtWallSteps}
          onChange={(v) => onCostInputs({ ...costInputs, extraExtWallSteps: v })}
          step={1}
        />
      </div>

      <h3 className="pt-2 text-sm font-semibold text-eh-forest">Veranda frames + railing</h3>
      <div className="grid grid-cols-3 gap-2">
        <NumRow label="Veranda A (1221)" value={verandaFrames.A} onChange={(v) => onVerandaFrames({ ...verandaFrames, A: v })} step={1} />
        <NumRow label="Veranda B (2442)" value={verandaFrames.B} onChange={(v) => onVerandaFrames({ ...verandaFrames, B: v })} step={1} />
        <NumRow label="Veranda C (3053)" value={verandaFrames.C} onChange={(v) => onVerandaFrames({ ...verandaFrames, C: v })} step={1} />
      </div>
      <NumRow label="Railing linear m" value={railingM} onChange={onRailingM} step={0.5} />
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span>{label}</span>
      {children}
    </label>
  );
}

function NumRow({
  label,
  value,
  onChange,
  step = 0.1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <label className="flex items-center justify-between gap-1 text-xs">
      <span>{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-20 rounded border border-eh-sage px-2 py-1 text-right font-mono"
      />
    </label>
  );
}

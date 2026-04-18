"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { EditorCanvas } from "@/components/admin/EditorCanvas";
import { PropertiesPanel } from "@/components/admin/PropertiesPanel";
import { FurniturePanel } from "@/components/admin/FurniturePanel";
import { ZonesPanel } from "@/components/admin/ZonesPanel";
import { MetadataPanel } from "@/components/admin/MetadataPanel";
import { PreviewPane } from "@/components/admin/PreviewPane";
import { UploadStep } from "@/components/admin/UploadStep";
import { CalibrationStep } from "@/components/admin/CalibrationStep";
import { aiPlanToModel } from "@/lib/admin/aiDetection";
import {
  initialState,
  type EditorState,
  type EditorTool,
  nextId,
} from "@/lib/admin/editorState";
import { deriveRenderLayers, type DimensionMode } from "@/lib/admin/deriveLayers";
import type { FloorPlanModel } from "@/types/floorPlan";

const TOOLS: Array<{ id: EditorTool; label: string; hint: string }> = [
  { id: "select", label: "Select", hint: "click to select; drag to move; del to remove" },
  { id: "wall", label: "Wall", hint: "click start, click end — ⇧ locks axis" },
  { id: "partition", label: "Partition", hint: "thin internal wall" },
  { id: "door", label: "Door", hint: "click on a wall to place" },
  { id: "window", label: "Window", hint: "click on a wall to place" },
  { id: "label", label: "Room label", hint: "click inside a room" },
];

export default function AdminFloorPlanEditor() {
  const [state, setState] = useState<EditorState>(initialState());
  const [dimensionMode, setDimensionMode] = useState<DimensionMode>("exterior");
  const [verandaFrames, setVerandaFrames] = useState({ A: 0, B: 0, C: 0 });
  const [railingM, setRailingM] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const set = useCallback(
    (patch: Partial<EditorState> | ((prev: EditorState) => Partial<EditorState>)) => {
      setState((prev) => ({
        ...prev,
        ...(typeof patch === "function" ? patch(prev) : patch),
      }));
    },
    [],
  );

  const onUpdateModel = useCallback(
    (model: FloorPlanModel) => set({ model }),
    [set],
  );

  // Step 1 → step 2
  const handleUploadComplete = ({
    background,
    detected,
  }: Parameters<
    React.ComponentProps<typeof UploadStep>["onComplete"]
  >[0]) => {
    const m = aiPlanToModel(detected);
    set({
      background,
      model: m,
      step: 2,
      previewLengthMm: m.viewBox.width,
      // Provisional calibration from AI's declared overall width.
      calibration: {
        pxPerMm: background.widthPx / m.viewBox.width,
      },
    });
  };

  // Step 2 → step 3
  const handleCalibrationConfirm = (pxPerMm: number) => {
    set({ calibration: { pxPerMm }, step: 3 });
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const resp = await fetch("/api/floorplans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: state.model,
          thumbnailDataUrl: state.background?.dataUrl,
        }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error ?? `save failed (${resp.status})`);
      setSaveMsg(`Saved to ${json.jsonPath}${json.thumbPath ? ` + ${json.thumbPath}` : ""}`);
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadJson = () => {
    const payload = JSON.stringify(state.model, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${state.model.id || "floorplan"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onSelect = useCallback((id: string | null) => set({ selectedId: id }), [set]);
  const onSetTool = useCallback(
    (tool: EditorTool) => set({ tool, wallDraft: null }),
    [set],
  );

  const onDuplicateSelected = () => {
    const el = state.model.elements.find((e) => e.id === state.selectedId);
    if (!el) return;
    const copy = { ...el, id: nextId(el.type.replace(/[^a-z]/g, "") || "el", state.model.elements) } as typeof el;
    set({
      model: { ...state.model, elements: [...state.model.elements, copy] },
      selectedId: copy.id,
    });
  };

  const onDeleteSelected = () => {
    if (!state.selectedId) return;
    set({
      model: {
        ...state.model,
        elements: state.model.elements.filter((e) => e.id !== state.selectedId),
      },
      selectedId: null,
    });
  };

  // The canvas renders derived layers (dims + auto-areas) on top so admin
  // sees what clients will see.
  const displayModel = useMemo<FloorPlanModel>(
    () => ({
      ...state.model,
      elements: deriveRenderLayers(state.model, dimensionMode),
    }),
    [state.model, dimensionMode],
  );

  return (
    <main className="mx-auto min-h-screen max-w-[1600px] space-y-4 p-4">
      <header className="flex items-baseline justify-between">
        <div>
          <p className="text-xs uppercase tracking-wider text-eh-forest/70">
            Easy Housing — Admin
          </p>
          <h1 className="text-xl font-semibold text-eh-forest">
            Floor plan editor
          </h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/" className="underline text-eh-forest">← cost engine</Link>
          <Link href="/floor-plan" className="underline text-eh-forest">floor plan preview</Link>
        </div>
      </header>

      {state.step === 1 && <UploadStep onComplete={handleUploadComplete} />}

      {state.step === 2 && state.background && (
        <CalibrationStep
          background={state.background}
          initialPxPerMm={state.calibration?.pxPerMm ?? null}
          onConfirm={handleCalibrationConfirm}
        />
      )}

      {state.step === 3 && (
        <div className="grid gap-3 lg:grid-cols-[220px_1fr_360px]">
          {/* Left rail — tools + furniture + zones */}
          <aside className="space-y-3">
            <div className="rounded border border-eh-sage p-3">
              <h3 className="mb-2 text-sm font-semibold text-eh-forest">Tools</h3>
              <div className="flex flex-col gap-1">
                {TOOLS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => onSetTool(t.id)}
                    className={`rounded px-2 py-1 text-left text-xs hover:bg-eh-sage ${
                      state.tool === t.id ? "bg-eh-sage font-semibold" : ""
                    }`}
                    title={t.hint}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <label className="mt-2 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={state.showBackground}
                  onChange={(e) => set({ showBackground: e.target.checked })}
                />
                background PNG
              </label>
              <label className="mt-1 flex items-center gap-2 text-xs">
                <span>opacity</span>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={state.backgroundOpacity}
                  onChange={(e) => set({ backgroundOpacity: Number(e.target.value) })}
                  className="flex-1"
                />
                <span className="w-8 text-right font-mono">
                  {state.backgroundOpacity.toFixed(2)}
                </span>
              </label>
              <label className="mt-1 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={state.showGrid}
                  onChange={(e) => set({ showGrid: e.target.checked })}
                />
                grid (610mm)
              </label>
              <label className="mt-1 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={!!state.calibration && state.background !== null}
                  readOnly
                />
                <span>
                  scale{" "}
                  {state.calibration ? `${state.calibration.pxPerMm.toFixed(4)} px/mm` : "—"}
                </span>
              </label>
              <button
                className="mt-2 w-full rounded border border-eh-sage px-2 py-1 text-xs hover:bg-eh-sage"
                onClick={() => set({ step: 2 })}
              >
                Re-calibrate
              </button>
            </div>

            <FurniturePanel model={state.model} onUpdateModel={onUpdateModel} />
            <ZonesPanel model={state.model} onUpdateModel={onUpdateModel} />

            <div className="rounded border border-eh-sage p-3 text-xs">
              <h3 className="mb-2 font-semibold text-eh-forest">Export</h3>
              <div className="flex flex-col gap-1">
                <button
                  className="rounded bg-eh-forest px-2 py-1 text-white hover:opacity-90 disabled:opacity-50"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save to data/floorplans/"}
                </button>
                <button
                  className="rounded border border-eh-sage px-2 py-1 hover:bg-eh-sage"
                  onClick={handleDownloadJson}
                >
                  Download JSON
                </button>
                {saveMsg && (
                  <p className="mt-1 font-mono text-[10px] text-eh-charcoal/70">{saveMsg}</p>
                )}
              </div>
            </div>
          </aside>

          {/* Centre — editor canvas (shows background + derived) */}
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2 text-xs">
              <span className="text-eh-charcoal/70">
                {TOOLS.find((t) => t.id === state.tool)?.hint}
              </span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1">
                  dims
                  <select
                    value={dimensionMode}
                    onChange={(e) => setDimensionMode(e.target.value as DimensionMode)}
                    className="rounded border border-eh-sage px-1 py-0.5"
                  >
                    <option value="off">off</option>
                    <option value="exterior">exterior</option>
                    <option value="all">all</option>
                  </select>
                </label>
              </div>
            </div>
            <EditorCanvas
              model={displayModel}
              tool={state.tool}
              background={state.background}
              pxPerMm={state.calibration?.pxPerMm ?? null}
              showBackground={state.showBackground}
              showGrid={state.showGrid}
              backgroundOpacity={state.backgroundOpacity}
              halfGrid={false}
              calibrationDraft={state.calibrationDraft}
              wallDraft={state.wallDraft}
              selectedId={state.selectedId}
              onUpdateModel={onUpdateModel}
              onCalibrateClick={() => void 0}
              onSetWallDraft={(p) => set({ wallDraft: p })}
              onSelect={onSelect}
            />
          </section>

          {/* Right rail — properties + metadata + preview */}
          <aside className="space-y-3">
            <PropertiesPanel
              model={state.model}
              selectedId={state.selectedId}
              onUpdateModel={onUpdateModel}
              onDelete={onDeleteSelected}
              onDuplicate={onDuplicateSelected}
            />
            <MetadataPanel
              model={state.model}
              onUpdateModel={onUpdateModel}
              frames={state.frameCounts}
              onFrames={(f) => set({ frameCounts: f })}
              costInputs={state.costInputs}
              onCostInputs={(c) => set({ costInputs: c })}
              verandaFrames={verandaFrames}
              onVerandaFrames={setVerandaFrames}
              railingM={railingM}
              onRailingM={setRailingM}
            />
            <div className="rounded border border-eh-sage p-3">
              <h3 className="mb-2 text-sm font-semibold text-eh-forest">Live preview</h3>
              <PreviewPane
                model={state.model}
                lengthMm={state.previewLengthMm}
                onLengthMm={(n) => set({ previewLengthMm: n })}
                dimensionMode={dimensionMode}
                onDimensionMode={setDimensionMode}
                showGrid={state.showGrid}
                onShowGrid={(b) => set({ showGrid: b })}
                frames={state.frameCounts}
                costInputs={state.costInputs}
              />
            </div>
          </aside>
        </div>
      )}
    </main>
  );
}

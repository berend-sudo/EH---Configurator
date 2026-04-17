"use client";

import Link from "next/link";
import { useState } from "react";
import { FloorPlanSVG } from "@/components/FloorPlanSVG";
import { MONO_PITCH_2BR_FLOOR_PLAN } from "@/data/floorPlans/monoPitch2BR";

export default function FloorPlanPreviewPage() {
  const model = MONO_PITCH_2BR_FLOOR_PLAN;
  const [lengthMm, setLengthMm] = useState(model.baseLengthMm);
  const [showGrid, setShowGrid] = useState(false);

  const minJumps = Math.round(model.minLengthMm / model.jumpSizeMm);
  const maxJumps = Math.round(model.maxLengthMm / model.jumpSizeMm);
  const currentJumps = Math.round(lengthMm / model.jumpSizeMm);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-8">
      <header className="flex items-baseline justify-between">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-wider text-eh-forest/70">
            Easy Housing — Phase 2a
          </p>
          <h1 className="text-2xl font-semibold text-eh-forest">
            Floor plan preview
          </h1>
          <p className="text-sm text-eh-charcoal/70">
            {model.name} · depth {model.depthMm} mm · base length{" "}
            {model.baseLengthMm} mm · {model.bedrooms}BR / {model.bathrooms}
            bath
          </p>
        </div>
        <Link
          href="/"
          className="text-sm underline text-eh-forest hover:text-eh-wood"
        >
          ← cost engine
        </Link>
      </header>

      <section className="rounded-md border border-eh-sage p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <span>Length (mm)</span>
            <input
              type="number"
              step={model.jumpSizeMm}
              min={model.minLengthMm}
              max={model.maxLengthMm}
              value={lengthMm}
              onChange={(e) => setLengthMm(Number(e.target.value))}
              className="w-28 rounded border border-eh-sage px-2 py-1 text-right font-mono"
            />
          </label>
          <span className="text-eh-charcoal/60">
            = {currentJumps} jumps of {model.jumpSizeMm} mm (range {minJumps}–
            {maxJumps})
          </span>
          <label className="ml-auto flex items-center gap-2">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
            />
            <span>Show 0.61 m grid</span>
          </label>
        </div>
        <p className="text-xs text-eh-charcoal/60">
          Phase 2a: length control is cosmetic — zone stretching logic arrives
          in 2b. The renderer proves the data model, SVG pipeline, and visual
          style.
        </p>
      </section>

      <section className="rounded-md border border-eh-sage bg-white p-4">
        <FloorPlanSVG
          model={model}
          lengthMm={lengthMm}
          showGrid={showGrid}
          className="h-auto w-full"
        />
      </section>

      <section className="rounded-md border border-eh-sage p-4">
        <h2 className="mb-2 text-sm font-semibold text-eh-forest">
          Zones ({model.zones.length})
        </h2>
        <table className="w-full text-xs">
          <thead className="text-eh-charcoal/60">
            <tr>
              <th className="text-left">Zone</th>
              <th className="text-right">Order</th>
              <th className="text-right">Base X</th>
              <th className="text-right">Width</th>
              <th className="text-right">Min / Max</th>
            </tr>
          </thead>
          <tbody>
            {model.zones.map((z) => (
              <tr key={z.id} className="border-t border-eh-sage/50">
                <td className="font-mono">{z.id}</td>
                <td className="text-right font-mono">{z.order}</td>
                <td className="text-right font-mono">
                  {z.xStartMm} → {z.xEndMm}
                </td>
                <td className="text-right font-mono">
                  {z.xEndMm - z.xStartMm} mm
                </td>
                <td className="text-right font-mono">
                  {z.minWidthMm} / {z.maxWidthMm}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

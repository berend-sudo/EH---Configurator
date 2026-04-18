"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FloorPlanSVG } from "@/components/FloorPlanSVG";
import { MONO_PITCH_2BR_FLOOR_PLAN } from "@/data/floorPlans/monoPitch2BR";
import { MONO_PITCH_2BR_DEFAULT } from "@/data/standardModels";
import { stretchFloorPlan } from "@/lib/floorPlan/stretch";
import {
  gfaForPlanAtLength,
  scaleAmountsToLength,
} from "@/lib/floorPlan/costForLength";
import { calculatePrice } from "@/lib/costEngine";

const ugx = new Intl.NumberFormat("en-UG", {
  style: "currency",
  currency: "UGX",
  maximumFractionDigits: 0,
});

export default function FloorPlanPreviewPage() {
  const plan = MONO_PITCH_2BR_FLOOR_PLAN;
  const [lengthMm, setLengthMm] = useState(plan.baseLengthMm);
  const [showGrid, setShowGrid] = useState(false);

  const minJumps = Math.round(plan.minLengthMm / plan.jumpSizeMm);
  const maxJumps = Math.round(plan.maxLengthMm / plan.jumpSizeMm);
  const currentJumps = Math.round(lengthMm / plan.jumpSizeMm);

  // Zone layout for the live-length panel.
  const stretch = useMemo(
    () => stretchFloorPlan(plan, lengthMm),
    [plan, lengthMm],
  );

  // Cost preview — scale the Excel's 2BR Mono Pitch component amounts to
  // the current slider length. Keeps the calibration preset intact while
  // giving the slider live feedback.
  const price = useMemo(() => {
    const amounts = scaleAmountsToLength(
      MONO_PITCH_2BR_DEFAULT.componentAmounts,
      // Excel default 2A + 4B + 0C = 12,210 mm structural length.
      2 * 1221 + 4 * 2442,
      lengthMm,
    );
    const gfa = gfaForPlanAtLength(plan, lengthMm);
    return calculatePrice({
      typology: plan.typology,
      componentAmounts: amounts,
      gfaSqm: gfa,
    });
  }, [plan, lengthMm]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-8">
      <header className="flex items-baseline justify-between">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-wider text-eh-forest/70">
            Easy Housing — Phase 2b
          </p>
          <h1 className="text-2xl font-semibold text-eh-forest">
            Floor plan preview
          </h1>
          <p className="text-sm text-eh-charcoal/70">
            {plan.name} · depth {plan.depthMm} mm · current length{" "}
            {lengthMm} mm · {plan.bedrooms}BR / {plan.bathrooms} bath
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
          <label className="flex flex-1 items-center gap-3">
            <span className="w-20 shrink-0">Length</span>
            <input
              type="range"
              step={plan.jumpSizeMm}
              min={plan.minLengthMm}
              max={plan.maxLengthMm}
              value={lengthMm}
              onChange={(e) => setLengthMm(Number(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              step={plan.jumpSizeMm}
              min={plan.minLengthMm}
              max={plan.maxLengthMm}
              value={lengthMm}
              onChange={(e) => setLengthMm(Number(e.target.value))}
              className="w-24 rounded border border-eh-sage px-2 py-1 text-right font-mono"
            />
            <span className="font-mono text-eh-charcoal/60">mm</span>
          </label>
          <span className="text-eh-charcoal/60">
            = {currentJumps} jumps of {plan.jumpSizeMm} mm (range {minJumps}–
            {maxJumps})
          </span>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showGrid}
              onChange={(e) => setShowGrid(e.target.checked)}
            />
            <span>Show 0.61 m grid</span>
          </label>
        </div>
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-t border-eh-sage/50 pt-3">
          <div className="text-xs text-eh-charcoal/60">
            GFA ≈ {price.gfaSqm.toFixed(1)} sqm · cost scaled linearly from
            Excel 2BR Mono Pitch base (12,210 mm).
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-sm text-eh-charcoal/70">
              Indicative price inc VAT
            </span>
            <span className="text-xl font-semibold text-eh-forest font-mono">
              {ugx.format(price.priceUgxIncVatRounded)}
            </span>
          </div>
        </div>
      </section>

      <section className="rounded-md border border-eh-sage bg-white p-4">
        <FloorPlanSVG
          model={plan}
          lengthMm={lengthMm}
          showGrid={showGrid}
          className="h-auto w-full"
        />
      </section>

      <section className="rounded-md border border-eh-sage p-4">
        <h2 className="mb-2 text-sm font-semibold text-eh-forest">
          Zones ({plan.zones.length}) — ordered stretch priority
        </h2>
        <table className="w-full text-xs">
          <thead className="text-eh-charcoal/60">
            <tr>
              <th className="text-left">Zone</th>
              <th className="text-right">Order</th>
              <th className="text-right">Base X</th>
              <th className="text-right">Current X</th>
              <th className="text-right">Width (base → now)</th>
              <th className="text-right">Min / Max</th>
            </tr>
          </thead>
          <tbody>
            {plan.zones.map((z) => {
              const l = stretch.zoneLayouts.find((lay) => lay.id === z.id);
              return (
                <tr key={z.id} className="border-t border-eh-sage/50">
                  <td className="font-mono">{z.id}</td>
                  <td className="text-right font-mono">{z.order}</td>
                  <td className="text-right font-mono">
                    {z.xStartMm} → {z.xEndMm}
                  </td>
                  <td className="text-right font-mono">
                    {l ? `${Math.round(l.newXStart)} → ${Math.round(l.newXEnd)}` : ""}
                  </td>
                  <td className="text-right font-mono">
                    {z.xEndMm - z.xStartMm} → {l ? Math.round(l.newWidth) : ""}
                  </td>
                  <td className="text-right font-mono">
                    {z.minWidthMm} / {z.maxWidthMm}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}

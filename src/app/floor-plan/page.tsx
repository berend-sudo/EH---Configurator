"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FloorPlanSVG } from "@/components/FloorPlanSVG";
import { LengthSlider } from "@/components/LengthSlider";
import { MONO_PITCH_2BR_FLOOR_PLAN } from "@/data/floorPlans/monoPitch2BR";
import { calculatePrice } from "@/lib/costEngine";
import { deriveAmounts } from "@/lib/floorPlan/deriveAmounts";
import { layoutZones } from "@/lib/floorPlan/zoneLayout";
import {
  decomposeJumps,
  frameComboLengthMm,
  jumpsForLengthMm,
} from "@/lib/frameCombo";

const WALL_THK_BOTH = 88 * 2;

const ugx = new Intl.NumberFormat("en-UG", {
  style: "currency",
  currency: "UGX",
  maximumFractionDigits: 0,
});
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default function FloorPlanPreviewPage() {
  const plan = MONO_PITCH_2BR_FLOOR_PLAN;

  // Slider controls the OUTER length. Convert to structural length for frame
  // decomposition. Jump bounds come from the plan's zone capacity clamped
  // to the typology min/max.
  const zoneCapacity = useMemo(() => {
    const dryRun = layoutZones(plan, { targetLengthMm: 0 });
    return { min: dryRun.minLengthMm, max: dryRun.maxLengthMm };
  }, [plan]);

  const minOuter = Math.max(zoneCapacity.min, plan.minLengthMm + WALL_THK_BOTH);
  const maxOuter = Math.min(zoneCapacity.max, plan.maxLengthMm + WALL_THK_BOTH);

  const [outerLengthMm, setOuterLengthMm] = useState(plan.viewBox.width);
  const [extraExtWallSteps, setExtraExtWallSteps] = useState(0);
  const [showGrid, setShowGrid] = useState(false);

  const structuralMm = outerLengthMm - WALL_THK_BOTH;
  const jumps = jumpsForLengthMm(structuralMm);
  const frames = useMemo(() => {
    try {
      return decomposeJumps(jumps);
    } catch {
      return null;
    }
  }, [jumps]);

  const derived = useMemo(() => {
    if (!frames) return null;
    return deriveAmounts({
      typology: plan.typology,
      frames,
      partitionsM: 12.5,  // 2BR Mono standard from Excel col G
      interiorDoors: 3,
      aluminiumSqm: 10.2,
      extraExtWallSteps,
      bathrooms: plan.bathrooms,
      depthMm: plan.depthMm,
    });
  }, [frames, plan, extraExtWallSteps]);

  const price = useMemo(() => {
    if (!derived) return null;
    return calculatePrice({
      componentAmounts: derived.componentAmounts,
      gfaSqm: derived.gfaSqm,
    });
  }, [derived]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-8">
      <header className="flex items-baseline justify-between">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-wider text-eh-forest/70">
            Easy Housing — Phase 2b
          </p>
          <h1 className="text-2xl font-semibold text-eh-forest">
            Parametric floor plan editor
          </h1>
          <p className="text-sm text-eh-charcoal/70">
            {plan.name} · depth {plan.depthMm} mm · {plan.bedrooms} BR /{" "}
            {plan.bathrooms} bath
          </p>
        </div>
        <Link
          href="/"
          className="text-sm underline text-eh-forest hover:text-eh-wood"
        >
          ← cost engine
        </Link>
      </header>

      <section className="grid gap-4 rounded-md border border-eh-sage p-4 md:grid-cols-[1fr_auto]">
        <div className="space-y-4">
          <LengthSlider
            lengthMm={outerLengthMm}
            minLengthMm={minOuter}
            maxLengthMm={maxOuter}
            jumpSizeMm={plan.jumpSizeMm}
            onChange={setOuterLengthMm}
            label="Outer length"
          />

          <div className="space-y-1">
            <div className="flex items-baseline justify-between gap-2">
              <label className="text-sm font-medium text-eh-forest">
                Extra exterior-wall grid steps
              </label>
              <span className="text-sm font-mono">
                {extraExtWallSteps} · {extraExtWallSteps * plan.jumpSizeMm} mm
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={6}
              step={1}
              value={extraExtWallSteps}
              onChange={(e) => setExtraExtWallSteps(Number(e.target.value))}
              className="w-full accent-eh-forest"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 self-end text-sm">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
          />
          <span>0.61 m grid</span>
        </label>
      </section>

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="rounded-md border border-eh-sage bg-white p-4">
          <FloorPlanSVG
            model={plan}
            lengthMm={outerLengthMm}
            showGrid={showGrid}
            className="h-auto w-full"
          />
        </div>

        <aside className="space-y-3 rounded-md border border-eh-sage p-4">
          <h2 className="text-sm font-semibold text-eh-forest">
            Live estimate
          </h2>

          {price && derived && frames ? (
            <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
              <dt className="text-eh-charcoal/70">Total incl. VAT</dt>
              <dd className="text-right font-mono font-semibold text-eh-forest">
                {ugx.format(price.priceUgxIncVatRounded)}
              </dd>
              <dt className="text-eh-charcoal/70">Unrounded</dt>
              <dd className="text-right font-mono">
                {ugx.format(price.priceUgxIncVat)}
              </dd>
              <dt className="text-eh-charcoal/70">Per m² GFA</dt>
              <dd className="text-right font-mono">
                {ugx.format(price.pricePerSqmUgxIncVat)}
              </dd>
              <dt className="text-eh-charcoal/70">GFA</dt>
              <dd className="text-right font-mono">
                {derived.gfaSqm.toFixed(1)} m²
              </dd>
              <dt className="text-eh-charcoal/70">USD equivalent</dt>
              <dd className="text-right font-mono">
                {usd.format(price.priceUsdIncVat)}
              </dd>

              <dt className="pt-2 border-t border-eh-sage text-eh-charcoal/70">
                Frame combo
              </dt>
              <dd className="pt-2 border-t border-eh-sage text-right font-mono">
                {frames.A}A + {frames.B}B + {frames.C}C
              </dd>
              <dt className="text-eh-charcoal/70">Structural length</dt>
              <dd className="text-right font-mono">
                {frameComboLengthMm(frames)} mm
              </dd>
              <dt className="text-eh-charcoal/70">Jumps</dt>
              <dd className="text-right font-mono">{jumps}</dd>
            </dl>
          ) : (
            <p className="text-sm text-eh-charcoal/60">
              No valid frame combo for {jumps} jumps.
            </p>
          )}
        </aside>
      </section>

      <section className="rounded-md border border-eh-sage p-4">
        <h2 className="mb-2 text-sm font-semibold text-eh-forest">
          Zone layout
        </h2>
        <ZoneTable outerLengthMm={outerLengthMm} />
      </section>
    </main>
  );
}

function ZoneTable({ outerLengthMm }: { outerLengthMm: number }) {
  const plan = MONO_PITCH_2BR_FLOOR_PLAN;
  const layout = layoutZones(plan, { targetLengthMm: outerLengthMm });
  return (
    <table className="w-full text-xs">
      <thead className="text-eh-charcoal/60">
        <tr>
          <th className="text-left">Zone</th>
          <th className="text-right">Order</th>
          <th className="text-right">Base width</th>
          <th className="text-right">Current width</th>
          <th className="text-right">Shift</th>
          <th className="text-right">Stretch</th>
        </tr>
      </thead>
      <tbody>
        {layout.zones.map((z) => (
          <tr key={z.id} className="border-t border-eh-sage/50">
            <td className="font-mono">{z.id}</td>
            <td className="text-right font-mono">{z.order}</td>
            <td className="text-right font-mono">{z.baseWidthMm} mm</td>
            <td className="text-right font-mono">{Math.round(z.widthMm)} mm</td>
            <td className="text-right font-mono">{Math.round(z.xShiftMm)} mm</td>
            <td className="text-right font-mono">
              {z.scaleX.toFixed(3)}×
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

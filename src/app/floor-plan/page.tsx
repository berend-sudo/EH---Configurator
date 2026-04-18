"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FloorPlanSVG } from "@/components/FloorPlanSVG";
import { MONO_PITCH_2BR_FLOOR_PLAN } from "@/data/floorPlans/monoPitch2BR";
import { MONO_PITCH_2BR_STANDARD } from "@/data/standardModels";
import { priceForLength } from "@/lib/floorPlan/priceForLength";
import { snapLength, stretchFloorPlan } from "@/lib/floorPlan/stretch";

const ugx = new Intl.NumberFormat("en-UG", {
  style: "currency",
  currency: "UGX",
  maximumFractionDigits: 0,
});

export default function FloorPlanPreviewPage() {
  const model = MONO_PITCH_2BR_FLOOR_PLAN;
  const baseStandard = MONO_PITCH_2BR_STANDARD;
  const [targetLengthMm, setTargetLengthMm] = useState(model.baseLengthMm);
  const [showGrid, setShowGrid] = useState(false);

  const lengthMm = snapLength(model, targetLengthMm);

  const stretched = useMemo(
    () => stretchFloorPlan(model, lengthMm),
    [model, lengthMm],
  );

  const priced = useMemo(
    () =>
      priceForLength({
        base: {
          columnsA: baseStandard.columnsA,
          columnsB: baseStandard.columnsB,
          columnsC: baseStandard.columnsC,
          partitionsM: baseStandard.partitionsM,
          interiorDoors: baseStandard.interiorDoors,
          aluminiumSqm: baseStandard.aluminiumSqm,
          bathrooms: baseStandard.bathrooms,
        },
        baseLengthMm: model.baseLengthMm,
        lengthMm,
      }),
    [baseStandard, model.baseLengthMm, lengthMm],
  );

  const minJumps = Math.round(model.minLengthMm / model.jumpSizeMm);
  const maxJumps = Math.round(model.maxLengthMm / model.jumpSizeMm);
  const currentJumps = Math.round(lengthMm / model.jumpSizeMm);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-8">
      <header className="flex items-baseline justify-between">
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-wider text-eh-forest/70">
            Easy Housing — Phase 2b
          </p>
          <h1 className="text-2xl font-semibold text-eh-forest">
            Floor plan + live price
          </h1>
          <p className="text-sm text-eh-charcoal/70">
            {model.name} · depth {model.depthMm} mm · base length{" "}
            {model.baseLengthMm} mm · {model.bedrooms}BR / {model.bathrooms}
            bath · base {baseStandard.columnsA}A + {baseStandard.columnsB}B +{" "}
            {baseStandard.columnsC}C
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
          <label className="flex flex-1 items-center gap-3 min-w-[320px]">
            <span className="shrink-0">Length</span>
            <input
              type="range"
              step={model.jumpSizeMm}
              min={model.minLengthMm}
              max={model.maxLengthMm}
              value={lengthMm}
              onChange={(e) => setTargetLengthMm(Number(e.target.value))}
              className="flex-1"
            />
            <input
              type="number"
              step={model.jumpSizeMm}
              min={model.minLengthMm}
              max={model.maxLengthMm}
              value={lengthMm}
              onChange={(e) => setTargetLengthMm(Number(e.target.value))}
              className="w-24 rounded border border-eh-sage px-2 py-1 text-right font-mono"
            />
            <span className="shrink-0 text-eh-charcoal/60">mm</span>
          </label>
          <span className="text-eh-charcoal/60">
            {currentJumps} jumps of {model.jumpSizeMm} mm (range {minJumps}–
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
        <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
          <Metric
            label="Price inc VAT (UGX)"
            value={ugx.format(priced.price.priceUgxIncVatRounded)}
            highlight
          />
          <Metric
            label="GFA"
            value={`${priced.gfaSqm.toFixed(2)} sqm`}
          />
          <Metric
            label="Derived columns (A + B + C)"
            value={`${priced.columns.a.toFixed(2)}A + ${priced.columns.b.toFixed(
              2,
            )}B + ${priced.columns.c.toFixed(2)}C`}
          />
        </div>
        <p className="text-xs text-eh-charcoal/60">
          The slider snaps to 610 mm jumps. As you drag, zones stretch
          according to their priority order and the cost engine re-runs
          with the new fractional A/B/C counts.
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
          Zones ({stretched.zones.length})
        </h2>
        <table className="w-full text-xs">
          <thead className="text-eh-charcoal/60">
            <tr>
              <th className="text-left">Zone</th>
              <th className="text-right">Order</th>
              <th className="text-right">Base width</th>
              <th className="text-right">Stretched width</th>
              <th className="text-right">Δ mm</th>
              <th className="text-right">Min / Max</th>
            </tr>
          </thead>
          <tbody>
            {stretched.zones.map((z) => (
              <tr key={z.id} className="border-t border-eh-sage/50">
                <td className="font-mono">{z.id}</td>
                <td className="text-right font-mono">{z.order}</td>
                <td className="text-right font-mono">{z.widthBaseMm}</td>
                <td className="text-right font-mono">
                  {Math.round(z.widthNewMm)}
                </td>
                <td className="text-right font-mono">
                  {Math.round(z.widthNewMm - z.widthBaseMm)}
                </td>
                <td className="text-right font-mono">
                  {z.minWidthMm} / {z.maxWidthMm}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="rounded-md border border-eh-sage p-4">
        <h2 className="mb-2 text-sm font-semibold text-eh-forest">
          Price breakdown
        </h2>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-4">
          <dt>Cost USD ex VAT</dt>
          <dd className="text-right font-mono">
            {priced.price.costUsdExVat.toFixed(2)}
          </dd>
          <dt>Margin (10%)</dt>
          <dd className="text-right font-mono">
            {priced.price.marginUsd.toFixed(2)}
          </dd>
          <dt>VAT (18%)</dt>
          <dd className="text-right font-mono">
            {priced.price.vatUsd.toFixed(2)}
          </dd>
          <dt>Price USD inc VAT</dt>
          <dd className="text-right font-mono">
            {priced.price.priceUsdIncVat.toFixed(2)}
          </dd>
          <dt>Price UGX inc VAT</dt>
          <dd className="text-right font-mono">
            {ugx.format(priced.price.priceUgxIncVat)}
          </dd>
          <dt>Rounded UP (100k)</dt>
          <dd className="text-right font-mono font-semibold text-eh-forest">
            {ugx.format(priced.price.priceUgxIncVatRounded)}
          </dd>
          <dt>Per sqm GFA</dt>
          <dd className="text-right font-mono">
            {ugx.format(priced.price.pricePerSqmUgxIncVat)}
          </dd>
        </dl>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-3 ${
        highlight
          ? "border-eh-forest bg-eh-forest/5"
          : "border-eh-sage bg-white"
      }`}
    >
      <div className="text-xs uppercase tracking-wider text-eh-charcoal/60">
        {label}
      </div>
      <div
        className={`mt-1 font-mono ${
          highlight ? "text-lg font-semibold text-eh-forest" : "text-sm"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

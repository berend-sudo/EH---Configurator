"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { calculatePrice } from "@/lib/costEngine";
import { MONO_PITCH_2BR_DEFAULT } from "@/data/standardModels";
import type { ComponentAmounts, ComponentId } from "@/types/costEngine";

const ugx = new Intl.NumberFormat("en-UG", {
  style: "currency",
  currency: "UGX",
  maximumFractionDigits: 0,
});
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

const TWEAKABLE: Array<{ id: ComponentId; label: string }> = [
  { id: "floor-frame-2442x1221", label: "Floor frames A (2442 × 1221)" },
  { id: "floor-frame-2442x2442", label: "Floor frames B (2442 × 2442)" },
  { id: "floor-frame-2442x3053", label: "Floor frames C (2442 × 3053)" },
  { id: "partition-wall-frame-per-m1", label: "Partitions (m)" },
  { id: "interior-door", label: "Interior doors" },
  { id: "aluminium-bulk-per-sqm", label: "Aluminium (sqm bulk)" },
  { id: "cement-boards-per-bathroom", label: "Bathrooms (cement boards)" },
];

export default function Phase1TestPage() {
  const [amounts, setAmounts] = useState<ComponentAmounts>(
    MONO_PITCH_2BR_DEFAULT.componentAmounts,
  );
  const [gfa, setGfa] = useState(MONO_PITCH_2BR_DEFAULT.gfaSqm);

  const result = useMemo(
    () => calculatePrice({ componentAmounts: amounts, gfaSqm: gfa }),
    [amounts, gfa],
  );

  const setAmount = (id: ComponentId, value: number) => {
    setAmounts((prev) => ({ ...prev, [id]: value }));
  };

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-8">
      <header className="flex items-baseline justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-wider text-eh-forest/70">
            Easy Housing — Phase 1
          </p>
          <h1 className="text-2xl font-semibold text-eh-forest">
            Cost engine sanity check
          </h1>
          <p className="text-sm text-eh-charcoal/70">
            Defaults reproduce the calculation template’s default Mono Pitch 2BR
            row. Expected price inc VAT ≈ 100,215,294 UGX.
          </p>
        </div>
        <Link
          href="/floor-plan"
          className="text-sm underline text-eh-forest hover:text-eh-wood"
        >
          floor plan →
        </Link>
      </header>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="space-y-3 rounded-md border border-eh-sage p-4">
          <h2 className="text-sm font-semibold text-eh-forest">Inputs</h2>
          {TWEAKABLE.map((row) => (
            <label key={row.id} className="flex items-center justify-between gap-4 text-sm">
              <span>{row.label}</span>
              <input
                type="number"
                step="0.1"
                value={amounts[row.id] ?? 0}
                onChange={(e) => setAmount(row.id, Number(e.target.value))}
                className="w-24 rounded border border-eh-sage px-2 py-1 text-right"
              />
            </label>
          ))}
          <label className="flex items-center justify-between gap-4 text-sm pt-2 border-t border-eh-sage">
            <span>GFA (sqm)</span>
            <input
              type="number"
              step="0.01"
              value={gfa}
              onChange={(e) => setGfa(Number(e.target.value))}
              className="w-24 rounded border border-eh-sage px-2 py-1 text-right"
            />
          </label>
        </div>

        <div className="space-y-3 rounded-md border border-eh-sage p-4">
          <h2 className="text-sm font-semibold text-eh-forest">Output</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <dt>Cost USD ex VAT</dt>
            <dd className="text-right font-mono">{usd.format(result.costUsdExVat)}</dd>
            <dt>Margin USD (10%)</dt>
            <dd className="text-right font-mono">{usd.format(result.marginUsd)}</dd>
            <dt>Sales price USD ex VAT</dt>
            <dd className="text-right font-mono">{usd.format(result.salesPriceUsdExVat)}</dd>
            <dt>VAT USD (18%)</dt>
            <dd className="text-right font-mono">{usd.format(result.vatUsd)}</dd>
            <dt>Price USD inc VAT</dt>
            <dd className="text-right font-mono">{usd.format(result.priceUsdIncVat)}</dd>
            <dt className="pt-2 border-t border-eh-sage">Price UGX inc VAT</dt>
            <dd className="text-right font-mono pt-2 border-t border-eh-sage">
              {ugx.format(result.priceUgxIncVat)}
            </dd>
            <dt>Rounded UP (100k)</dt>
            <dd className="text-right font-mono font-semibold text-eh-forest">
              {ugx.format(result.priceUgxIncVatRounded)}
            </dd>
            <dt>Per sqm GFA</dt>
            <dd className="text-right font-mono">{ugx.format(result.pricePerSqmUgxIncVat)}</dd>
          </dl>
        </div>
      </section>

      <section className="rounded-md border border-eh-sage p-4">
        <h2 className="mb-2 text-sm font-semibold text-eh-forest">
          Component breakdown ({result.componentBreakdown.length} lines)
        </h2>
        <table className="w-full text-xs">
          <thead className="text-eh-charcoal/60">
            <tr>
              <th className="text-left">Component</th>
              <th className="text-right">Amount</th>
              <th className="text-right">Unit USD</th>
              <th className="text-right">+ flat USD</th>
              <th className="text-right">Total USD</th>
            </tr>
          </thead>
          <tbody>
            {result.componentBreakdown.map((line) => (
              <tr key={line.id} className="border-t border-eh-sage/50">
                <td>{line.name}</td>
                <td className="text-right font-mono">{line.amount}</td>
                <td className="text-right font-mono">{line.unitCostUsd.toFixed(2)}</td>
                <td className="text-right font-mono">
                  {line.fixedExtraUsd ? line.fixedExtraUsd.toFixed(0) : ""}
                </td>
                <td className="text-right font-mono">{line.totalUsd.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}

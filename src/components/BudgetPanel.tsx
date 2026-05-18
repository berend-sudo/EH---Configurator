"use client";

import { useState } from "react";
import type { FloorplanJSON } from "@/types/floorplan";
import {
  countRooms,
  calculateBudget,
  detectIsClere,
  USD_RATE,
  type BudgetLineItem,
} from "@/lib/budget";

interface Props {
  plan: FloorplanJSON;
  delta: number;
}

function fmt(ugx: number): string {
  return Math.round(ugx).toLocaleString("en-UG");
}

function fmtUsd(ugx: number): string {
  return Math.round(ugx / USD_RATE).toLocaleString("en-UG");
}

function LineRow({ item }: { item: BudgetLineItem }) {
  return (
    <div className="flex justify-between items-baseline py-1.5 border-b border-stone-100 last:border-0">
      <span className="text-sm text-stone-600">{item.label}</span>
      <span className="text-sm font-mono text-stone-800 ml-4 whitespace-nowrap">
        {fmt(item.amount)}{" "}
        <span className="text-stone-400 text-xs">(~${fmtUsd(item.amount)})</span>
      </span>
    </div>
  );
}

export default function BudgetPanel({ plan, delta }: Props) {
  const [includeFinishings, setIncludeFinishings] = useState(false);

  const rooms   = countRooms(plan, delta);
  const isClere = detectIsClere(plan.name);
  const budget  = calculateBudget(rooms, isClere);
  const total   = includeFinishings ? budget.grandTotal : budget.coreTotal;
  const totalLbl = includeFinishings ? "Grand Total" : "Total (structure)";

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-stone-700">Estimated Budget</h2>
          <p className="text-xs text-stone-400 mt-0.5">
            GFA {rooms.gfa.toFixed(1)} m²
            {rooms.terraceArea > 0 && ` · Terrace ${rooms.terraceArea.toFixed(1)} m² (excl.)`}
            {" · "}{rooms.bedrooms} bed · {rooms.bathrooms} bath
            {rooms.kitchens > 0 && ` · ${rooms.kitchens} kitchen`}
            {isClere && " · Clerestory rate"}
          </p>
        </div>
        <span className="text-xs text-stone-400 font-mono bg-stone-50 border border-stone-200 px-2 py-1 rounded">
          {budget.sqmRate.toLocaleString("en-UG")} UGX/m²
        </span>
      </div>

      <div className="mb-3">
        {budget.lines.core.map((item) => (
          <LineRow key={item.label} item={item} />
        ))}
      </div>

      <label className="flex items-center gap-2 cursor-pointer mb-3 select-none">
        <input
          type="checkbox"
          checked={includeFinishings}
          onChange={(e) => setIncludeFinishings(e.target.checked)}
          className="accent-stone-700 w-4 h-4"
        />
        <span className="text-sm text-stone-600">Include finishings</span>
      </label>

      {includeFinishings && budget.lines.optional.length > 0 && (
        <div className="mb-3 pl-3 border-l-2 border-stone-100">
          {budget.lines.optional.map((item) => (
            <LineRow key={item.label} item={item} />
          ))}
        </div>
      )}

      <div className="flex justify-between items-baseline pt-3 border-t border-stone-200">
        <span className="text-sm font-semibold text-stone-800">{totalLbl}</span>
        <div className="text-right">
          <span className="text-base font-semibold font-mono text-stone-900">
            {fmt(total)} UGX
          </span>
          <span className="block text-xs text-stone-400">≈ ${fmtUsd(total)} USD</span>
        </div>
      </div>
    </div>
  );
}

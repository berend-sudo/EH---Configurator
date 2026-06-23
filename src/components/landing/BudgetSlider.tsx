"use client";

import { useState } from "react";
import { fmtLocal } from "@/lib/countries";

type Props = {
  value: number;
  min?: number;
  max?: number;
  /** Drag granularity in the native currency (defaults to the UGX display step). */
  step?: number;
  onChange: (n: number) => void;
};

// `value`, `min` and `max` are in the active country's NATIVE currency (the
// real indicative-price range from the engine), so they format with `fmtLocal`
// — no FX. The min/max come from the catalog's cheapest@min-width and
// priciest@max-width via the price index.
export default function BudgetSlider({ value, min = 42_000_000, max = 115_000_000, step = 500_000, onChange }: Props) {
  // Track the live drag locally so the thumb follows the pointer smoothly even
  // if the parent commits the value asynchronously (e.g. via a URL round-trip)
  // or re-renders mid-drag. `drag` is null except while actively dragging.
  const [drag, setDrag] = useState<number | null>(null);
  const shown = drag ?? value;
  const pct = ((shown - min) / (max - min)) * 100;
  const endDrag = () => setDrag(null);
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        {/* TODO(X2): "Your budget" vs "Price" on the landing wants a final
            wording decision from sales. Single change point — flip the
            string here once confirmed. */}
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--eh-text-muted)" }}>
          Your budget
        </span>
        <span style={{ fontSize: 20, fontWeight: 600, color: "var(--eh-text)", fontVariantNumeric: "tabular-nums" }}>
          {fmtLocal(shown)}
        </span>
      </div>
      <div style={{ position: "relative", height: 22, display: "flex", alignItems: "center" }}>
        <div className="rail" style={{ width: "100%" }}>
          <div className="rail__fill" style={{ width: `${pct}%` }} />
          <div className="rail__knob" style={{ left: `${pct}%` }} />
        </div>
        <input
          className="range-native"
          type="range"
          min={min}
          max={max}
          step={step}
          value={shown}
          onChange={(e) => {
            const v = Number(e.target.value);
            setDrag(v);
            onChange(v);
          }}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onBlur={endDrag}
          aria-label="Your budget"
        />
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 8,
          fontSize: 12,
          color: "var(--eh-text-soft)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <span>{fmtLocal(min)}</span>
        <span>{fmtLocal(max)}</span>
      </div>
    </div>
  );
}

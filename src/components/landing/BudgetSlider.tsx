"use client";

import { useState } from "react";
import { fmtMoney } from "@/lib/countries";

type Props = {
  value: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
};

export default function BudgetSlider({ value, min = 42_000_000, max = 115_000_000, onChange }: Props) {
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
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--eh-text-muted)" }}>
          Budget
        </span>
        <span style={{ fontSize: 20, fontWeight: 600, color: "var(--eh-text)", fontVariantNumeric: "tabular-nums" }}>
          {fmtMoney(shown)}
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
          step={500_000}
          value={shown}
          onChange={(e) => {
            const v = Number(e.target.value);
            setDrag(v);
            onChange(v);
          }}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onBlur={endDrag}
          aria-label="Budget"
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
        <span>{fmtMoney(min)}</span>
        <span>{fmtMoney(max)}</span>
      </div>
    </div>
  );
}

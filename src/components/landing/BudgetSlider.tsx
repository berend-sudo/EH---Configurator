"use client";

import { fmtUGX } from "./fmtUGX";

type Props = {
  value: number;
  min?: number;
  max?: number;
  onChange: (n: number) => void;
};

export default function BudgetSlider({ value, min = 42_000_000, max = 115_000_000, onChange }: Props) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".08em", textTransform: "uppercase", color: "var(--eh-text-muted)" }}>
          Budget
        </span>
        <span style={{ fontSize: 20, fontWeight: 600, color: "var(--eh-text)", fontVariantNumeric: "tabular-nums" }}>
          {fmtUGX(value)}
        </span>
      </div>
      <div style={{ position: "relative", height: 22, display: "flex", alignItems: "center" }}>
        <input
          className="range-native"
          type="range"
          min={min}
          max={max}
          step={500_000}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Budget"
        />
        <div className="rail" style={{ width: "100%" }}>
          <div className="rail__fill" style={{ width: `${pct}%` }} />
          <div className="rail__knob" style={{ left: `${pct}%` }} />
        </div>
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
        <span>{fmtUGX(min)}</span>
        <span>{fmtUGX(max)}</span>
      </div>
    </div>
  );
}

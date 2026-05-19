"use client";

interface Props {
  label: string;
  valueMm: number;
  minMm: number;
  maxMm: number;
  stepMm: number;
  onChange: (mm: number) => void;
}

export default function SliderRow({ label, valueMm, minMm, maxMm, stepMm, onChange }: Props) {
  const valueM = valueMm / 1000;
  const minM = minMm / 1000;
  const maxM = maxMm / 1000;
  const pct = maxMm > minMm ? ((valueMm - minMm) / (maxMm - minMm)) * 100 : 0;

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <span style={{ fontSize: 14, fontWeight: 500, color: "var(--eh-text)" }}>{label}</span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            background: "var(--eh-bg-alt)",
            borderRadius: 10,
            padding: "4px 12px",
            fontSize: 14,
            fontWeight: 600,
            color: "var(--eh-text)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {valueM.toFixed(2)} <span style={{ opacity: 0.55, fontWeight: 400 }}>m</span>
        </span>
      </div>

      {/* Visual rail with an invisible <input type=range> overlay — pattern from globals.css */}
      <div style={{ position: "relative", height: 22 }}>
        <input
          type="range"
          className="range-native"
          min={minMm}
          max={maxMm}
          step={stepMm}
          value={valueMm}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label={label}
        />
        <div className="rail" style={{ position: "absolute", left: 0, right: 0, top: "50%", transform: "translateY(-50%)" }}>
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
        }}
      >
        <span>{minM.toFixed(1)} m</span>
        <span>{maxM.toFixed(1)} m</span>
      </div>
    </div>
  );
}

"use client";

import { isAffordable, isRoofAvailable, type BudgetTable, type RoofType } from "./pricing-helpers";

type Props = {
  value: RoofType;
  onChange: (r: RoofType) => void;
  budget: number;
  budgetTable: BudgetTable | null;
};

const TYPES: { id: RoofType; label: string; path: string }[] = [
  { id: "monopitch", label: "Monopitch", path: "M 6 28 L 6 14 L 50 6 L 50 28 Z" },
  { id: "gable", label: "Gable", path: "M 6 28 L 6 16 L 28 6 L 50 16 L 50 28 Z" },
  {
    id: "clerestory",
    label: "Clerestory",
    // Two roof planes at ~10° in opposite directions with a vertical
    // clerestory window strip dropping between them.
    path: "M 6 28 L 6 9 L 24 6 L 24 14 L 50 19 L 50 28 Z",
  },
];

export default function RoofPicker({ value, onChange, budget, budgetTable }: Props) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: ".08em",
          textTransform: "uppercase",
          color: "var(--eh-text-muted)",
          marginBottom: 14,
        }}
      >
        Roof type
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
        {TYPES.map((t) => {
          const active = t.id === value;
          const affordable = isAffordable(budgetTable, t.id, budget);
          const available = isRoofAvailable(t.id);
          const disabled = (!affordable || !available) && !active;
          const tooltip = !available ? "Coming soon" : !affordable ? "Over budget" : undefined;
          const strokeColor = disabled
            ? "var(--eh-text-soft)"
            : active
            ? "var(--eh-green)"
            : "var(--eh-green-900)";
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                if (!disabled) onChange(t.id);
              }}
              aria-pressed={active}
              aria-disabled={disabled || undefined}
              disabled={disabled}
              title={tooltip}
              style={{
                padding: "14px 10px",
                borderRadius: 14,
                textAlign: "center",
                cursor: disabled ? "not-allowed" : "pointer",
                background: active ? "var(--eh-green-900)" : "#fff",
                color: disabled ? "var(--eh-text-soft)" : active ? "#fff" : "var(--eh-text)",
                border: active ? "1.5px solid var(--eh-green-900)" : "1.5px solid var(--eh-stroke)",
                opacity: disabled ? 0.55 : 1,
                transition: "all .15s var(--eh-ease)",
                font: "inherit",
              }}
            >
              <svg viewBox="0 0 56 32" width="56" height="32" style={{ display: "block", margin: "0 auto 6px" }} aria-hidden="true">
                <path d={t.path} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinejoin="round" />
              </svg>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{t.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

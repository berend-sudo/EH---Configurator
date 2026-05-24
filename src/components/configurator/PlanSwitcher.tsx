"use client";

import TypologyPicker from "@/components/landing/TypologyPicker";
import { priceFor, type Selection } from "@/lib/typologies";

const BEDROOM_OPTIONS = [
  { value: 0, label: "Studio" },
  { value: 1, label: "1BR" },
  { value: 2, label: "2BR" },
  { value: 3, label: "3BR" },
  { value: 4, label: "4BR" },
] as const;

interface Props {
  bedrooms: number;
  selection: Selection;
  budget: number;
  onChange: (next: { bedrooms?: number; selection?: Selection }) => void;
}

export default function PlanSwitcher({ bedrooms, selection, budget, onChange }: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Bedrooms row */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--eh-text-muted)",
          }}
        >
          Bedrooms
        </div>
        <div className="seg" role="tablist" aria-label="Bedrooms">
          {BEDROOM_OPTIONS.map((opt) => {
            const affordable = priceFor(selection, opt.value) <= budget;
            const isActive = opt.value === bedrooms;
            const disabled = !affordable && !isActive;
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={isActive ? "is-active" : ""}
                disabled={disabled}
                title={disabled ? "Needs more budget" : undefined}
                style={disabled ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                onClick={() => {
                  if (disabled || isActive) return;
                  onChange({ bedrooms: opt.value });
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Typology + subtype picker (compact) */}
      <TypologyPicker
        selection={selection}
        budget={budget}
        compact
        onChange={(sel) => onChange({ selection: sel })}
      />
    </div>
  );
}

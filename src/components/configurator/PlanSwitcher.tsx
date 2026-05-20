"use client";

import type { LandingRoof } from "@/lib/budget";
import { priceFor, type BudgetTable } from "@/components/landing/pricing-helpers";

const BEDROOM_OPTIONS = [
  { value: 0, label: "Studio" },
  { value: 1, label: "1BR" },
  { value: 2, label: "2BR" },
  { value: 3, label: "3BR" },
] as const;

const ROOF_OPTIONS: Array<{ value: LandingRoof; label: string; available: boolean }> = [
  { value: "monopitch",  label: "Monopitch",  available: true  },
  { value: "gable",      label: "Gable",      available: false },
  { value: "clerestory", label: "Clerestory", available: false },
];

interface Props {
  bedrooms: number;
  roof: LandingRoof;
  budget: number;
  budgetTable: BudgetTable | null;
  onChange: (next: { bedrooms?: number; roof?: LandingRoof }) => void;
}

export default function PlanSwitcher({ bedrooms, roof, budget, budgetTable, onChange }: Props) {
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
            const price = priceFor(budgetTable, roof, opt.value);
            const affordable = price == null || price <= budget;
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
                title={disabled ? "Over budget" : undefined}
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

      {/* Roof row */}
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
          Roof
        </div>
        <div className="seg" role="tablist" aria-label="Roof">
          {ROOF_OPTIONS.map((opt) => {
            const isActive = opt.value === roof;
            const disabled = !opt.available && !isActive;
            return (
              <button
                key={opt.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={isActive ? "is-active" : ""}
                disabled={disabled}
                title={disabled ? "Coming soon" : undefined}
                style={disabled ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                onClick={() => {
                  if (disabled || isActive) return;
                  onChange({ roof: opt.value });
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

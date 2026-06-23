"use client";

import TypologyPicker from "@/components/landing/TypologyPicker";
import { type Selection } from "@/lib/typologies";
import { priceForSelection, type Currency, type PriceIndex } from "@/lib/affordability";
import { availableBedrooms, type FloorPlanEntry } from "@/lib/floor-plans";

const BEDROOM_LABEL: Record<number, string> = {
  0: "Studio",
  1: "1BR",
  2: "2BR",
  3: "3BR",
  4: "4BR",
};

interface Props {
  bedrooms: number;
  selection: Selection;
  budget: number;
  onChange: (next: { bedrooms?: number; selection?: Selection }) => void;
  /** Scanned plans; gates the bedroom seg + typology picker. */
  plans?: FloorPlanEntry[];
  /** Real-engine price index + active currency for the affordability gate. */
  priceIndex?: PriceIndex | null;
  currency?: Currency;
}

export default function PlanSwitcher({
  bedrooms,
  selection,
  budget,
  onChange,
  plans,
  priceIndex,
  currency = "UGX",
}: Props) {
  // Bedroom options: only those that have a DXF for the current selection.
  // Plus the currently-active value if it isn't in the set (e.g. while the
  // fallback notice is showing) so the seg always reflects the URL state.
  const onDisk = plans ? availableBedrooms(plans, selection) : [0, 1, 2, 3, 4];
  const options = Array.from(new Set(onDisk.concat([bedrooms]))).sort((a, b) => a - b);

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
          {options.map((value) => {
            const affordable = priceForSelection(priceIndex, currency, selection, value) <= budget;
            const isActive = value === bedrooms;
            const disabled = !affordable && !isActive;
            return (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={isActive ? "is-active" : ""}
                disabled={disabled}
                title={disabled ? "Needs more budget" : undefined}
                style={disabled ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
                onClick={() => {
                  if (disabled || isActive) return;
                  onChange({ bedrooms: value });
                }}
              >
                {BEDROOM_LABEL[value] ?? `${value}BR`}
              </button>
            );
          })}
        </div>
      </div>

      {/* Typology + subtype picker (compact) */}
      <TypologyPicker
        selection={selection}
        budget={budget}
        priceIndex={priceIndex}
        currency={currency}
        compact
        plans={plans}
        onChange={(sel) => onChange({ selection: sel })}
      />
    </div>
  );
}

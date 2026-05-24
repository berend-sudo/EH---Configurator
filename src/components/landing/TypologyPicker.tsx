"use client";

import {
  TYPOLOGIES,
  TYPOLOGY_ORDER,
  typologyAvailability,
  subtypeAvailability,
  cheapestAffordableSubtype,
  depthLabel,
  type Selection,
  type TypologyId,
} from "@/lib/typologies";

type Props = {
  selection: Selection;
  onChange: (sel: Selection) => void;
  budget: number;
  /** Compact variant for the in-configurator step-1 collapse. */
  compact?: boolean;
};

// Monopitch has no subtypes; borrow another typology's chips as invisible
// placeholder content so the strip keeps a constant measured height.
const PLACEHOLDER_TYPOLOGY: TypologyId = "gable";

export default function TypologyPicker({
  selection,
  onChange,
  budget,
  compact = false,
}: Props) {
  const gap = compact ? 6 : 8;
  const radius = compact ? 12 : 14;
  const tileLabelSize = compact ? 11 : 13;
  const depthSize = compact ? 10 : 11;
  const metaH = compact ? 14 : 16;
  const chipLabelSize = compact ? 12 : 13;
  const eyebrowSize = compact ? 9 : 11;
  const iconW = compact ? 44 : 56;
  const iconH = compact ? 26 : 32;

  const typAvail = typologyAvailability(budget);
  const activeTyp = TYPOLOGIES[selection.typology];
  const stripTypology: TypologyId = activeTyp.subtypes
    ? selection.typology
    : PLACEHOLDER_TYPOLOGY;
  const stripHidden = !activeTyp.subtypes;
  const subAvail = subtypeAvailability(budget, stripTypology);
  const stripDef = TYPOLOGIES[stripTypology];

  const selectTypology = (id: TypologyId) => {
    if (id === selection.typology) return;
    if (!typAvail[id]) return; // disabled tile — ignore
    const typ = TYPOLOGIES[id];
    if (!typ.subtypes) {
      onChange({ typology: id, subtype: null });
      return;
    }
    const sub =
      cheapestAffordableSubtype(budget, id) ?? Object.keys(typ.subtypes)[0];
    onChange({ typology: id, subtype: sub });
  };

  const selectSubtype = (sub: string) => {
    if (stripHidden) return;
    if (!subAvail[sub]) return; // disabled chip — ignore
    onChange({ typology: selection.typology, subtype: sub });
  };

  return (
    <div>
      <div
        style={{
          fontSize: eyebrowSize,
          fontWeight: 600,
          letterSpacing: ".1em",
          textTransform: "uppercase",
          color: "var(--eh-text-muted)",
          marginBottom: compact ? 8 : 12,
        }}
      >
        Roof type
      </div>

      {/* Main typology row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap }}>
        {TYPOLOGY_ORDER.map((id) => {
          const typ = TYPOLOGIES[id];
          const active = id === selection.typology;
          const affordable = typAvail[id];
          const disabled = !affordable && !active;
          // Depth on the tile only for typologies without subtypes (Monopitch).
          const meta = !typ.subtypes
            ? depthLabel({ typology: id, subtype: null })
            : disabled
            ? "Needs more budget"
            : "";
          return (
            <button
              key={id}
              type="button"
              onClick={() => selectTypology(id)}
              aria-pressed={active}
              aria-disabled={disabled || undefined}
              disabled={disabled}
              title={disabled ? "Needs more budget" : undefined}
              style={{
                padding: compact ? "10px 8px" : "14px 10px",
                borderRadius: radius,
                textAlign: "center",
                cursor: disabled ? "not-allowed" : "pointer",
                background: active ? "var(--eh-green-900)" : "var(--eh-card)",
                color: active ? "var(--eh-text-on-dark)" : "var(--eh-text)",
                border: active
                  ? "1.5px solid var(--eh-green-900)"
                  : "1.5px solid var(--eh-stroke)",
                opacity: disabled ? 0.42 : 1,
                transition: "all .15s var(--eh-ease)",
                font: "inherit",
              }}
            >
              <svg
                viewBox="0 0 56 32"
                width={iconW}
                height={iconH}
                style={{ display: "block", margin: "0 auto 6px" }}
                aria-hidden="true"
              >
                <path
                  d={typ.iconPath}
                  fill="none"
                  stroke={active ? "var(--eh-green)" : "var(--eh-green-700)"}
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
              <div style={{ fontSize: tileLabelSize, fontWeight: 500 }}>{typ.label}</div>
              {/* Fixed-height meta slot — keeps tile heights constant. */}
              <div
                style={{
                  height: metaH,
                  marginTop: 2,
                  fontSize: depthSize,
                  fontWeight: 400,
                  fontVariantNumeric: "tabular-nums",
                  color: active ? "var(--eh-green-200)" : "var(--eh-text-soft)",
                  lineHeight: `${metaH}px`,
                  overflow: "hidden",
                }}
              >
                {meta}
              </div>
            </button>
          );
        })}
      </div>

      {/* Docked subtype strip. Hidden (but space-reserving) for Monopitch. */}
      <div
        aria-hidden={stripHidden || undefined}
        style={{
          visibility: stripHidden ? "hidden" : "visible",
          pointerEvents: stripHidden ? "none" : "auto",
          marginTop: gap,
          background: "var(--eh-green-900)",
          borderRadius: radius,
          padding: compact ? "10px 12px" : "12px 14px",
        }}
      >
        <div
          style={{
            fontSize: eyebrowSize,
            fontWeight: 600,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            color: "var(--eh-green-200)",
            marginBottom: compact ? 7 : 9,
          }}
        >
          {stripDef.label} — size
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap }}>
          {Object.entries(stripDef.subtypes ?? {}).map(([subId, sub]) => {
            const active = !stripHidden && subId === selection.subtype;
            const affordable = subAvail[subId];
            const disabled = !stripHidden && !affordable;
            const depth = depthLabel({ typology: stripTypology, subtype: subId });
            return (
              <button
                key={subId}
                type="button"
                onClick={() => selectSubtype(subId)}
                aria-pressed={active}
                aria-disabled={disabled || undefined}
                disabled={disabled || stripHidden}
                title={disabled ? "Needs more budget" : undefined}
                style={{
                  display: "inline-flex",
                  alignItems: "baseline",
                  gap: 5,
                  padding: compact ? "6px 12px" : "7px 14px",
                  borderRadius: 999,
                  cursor: disabled ? "not-allowed" : "pointer",
                  background: active ? "var(--eh-green)" : "transparent",
                  color: active ? "var(--eh-green-900)" : "var(--eh-text-on-dark)",
                  border: active
                    ? "1.5px solid var(--eh-green)"
                    : "1.5px solid rgba(255,255,255,0.28)",
                  opacity: disabled ? 0.38 : 1,
                  transition: "all .15s var(--eh-ease)",
                  font: "inherit",
                }}
              >
                <span
                  style={{
                    fontSize: chipLabelSize,
                    fontWeight: active ? 600 : 500,
                    textDecoration: disabled ? "line-through" : "none",
                  }}
                >
                  {sub.label}
                </span>
                {depth && (
                  <span
                    style={{
                      fontSize: depthSize,
                      fontWeight: 400,
                      fontVariantNumeric: "tabular-nums",
                      opacity: 0.85,
                    }}
                  >
                    ({depth})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

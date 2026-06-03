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
import {
  availableTypologies,
  availableSubtypes,
  type FloorPlanEntry,
} from "@/lib/floor-plans";

type Props = {
  selection: Selection;
  onChange: (sel: Selection) => void;
  budget: number;
  /** Compact variant for the in-configurator step-1 collapse. */
  compact?: boolean;
  /**
   * Scanned plans. When provided, the picker hides typologies and subtypes
   * with no available DXF on disk. When omitted, every typology/subtype in
   * TYPOLOGIES is shown (legacy behavior).
   */
  plans?: FloorPlanEntry[];
};

export default function TypologyPicker({
  selection,
  onChange,
  budget,
  compact = false,
  plans,
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

  // Typologies / subtypes to render. If `plans` is provided, hide anything
  // with no available DXF; otherwise show the full TYPOLOGIES set.
  const typologiesShown: TypologyId[] = plans
    ? availableTypologies(plans)
    : [...TYPOLOGY_ORDER];

  const typAvail = typologyAvailability(budget);
  const activeTyp = TYPOLOGIES[selection.typology];

  // Strip placeholder typology — when the active one has no subtypes (or none
  // available), borrow the first typology that does so the strip keeps its
  // measured height. Falls through to monopitch if nothing is subtyped.
  const firstSubtyped = typologiesShown.find((id) => {
    const t = TYPOLOGIES[id];
    if (!t.subtypes) return false;
    return !plans || availableSubtypes(plans, id).length > 0;
  });
  const stripTypology: TypologyId =
    activeTyp.subtypes && (!plans || availableSubtypes(plans, selection.typology).length > 0)
      ? selection.typology
      : (firstSubtyped ?? selection.typology);
  const stripHidden = stripTypology !== selection.typology;
  const subAvail = subtypeAvailability(budget, stripTypology);
  const stripDef = TYPOLOGIES[stripTypology];
  const subtypeIdsShown: string[] = plans
    ? availableSubtypes(plans, stripTypology)
    : Object.keys(stripDef.subtypes ?? {});

  const selectTypology = (id: TypologyId) => {
    if (id === selection.typology) return;
    if (!typAvail[id]) return; // disabled tile — ignore
    const typ = TYPOLOGIES[id];
    if (!typ.subtypes) {
      onChange({ typology: id, subtype: null });
      return;
    }
    // Prefer the cheapest affordable subtype that is also on disk; otherwise
    // fall back to the first available, or the first defined subtype.
    const onDisk = plans ? availableSubtypes(plans, id) : Object.keys(typ.subtypes);
    const cheapest = cheapestAffordableSubtype(budget, id);
    const sub =
      (cheapest && onDisk.includes(cheapest) && cheapest)
      || onDisk[0]
      || Object.keys(typ.subtypes)[0];
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
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${Math.max(typologiesShown.length, 1)}, 1fr)`,
          gap,
        }}
      >
        {typologiesShown.map((id) => {
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
          {subtypeIdsShown.map((subId) => {
            const sub = stripDef.subtypes![subId];
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

"use client";

import {
  TYPOLOGIES,
  TYPOLOGY_ORDER,
  depthLabel,
  type Selection,
  type TypologyId,
} from "@/lib/typologies";
import {
  typologyAffordability,
  subtypeAffordability,
  cheapestAffordableSubtype,
  type Currency,
  type PriceIndex,
} from "@/lib/affordability";
import {
  availableTypologies,
  availableSubtypes,
  type FloorPlanEntry,
} from "@/lib/floor-plans";

// Lucide `lock` glyph, inlined (no runtime dep) — the single "over budget"
// affordance shared by tiles and chips. Inherits `currentColor` so it tints to
// whatever the surrounding text uses.
function LockIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

type Props = {
  selection: Selection;
  onChange: (sel: Selection) => void;
  budget: number;
  /** Real-engine price index + active currency drive the affordability
   *  grey-out. Omitted → everything shows as affordable (legacy). */
  priceIndex?: PriceIndex | null;
  currency?: Currency;
  /** Compact variant for the in-configurator step-1 collapse. */
  compact?: boolean;
  /**
   * Scanned plans. When provided, the picker hides typologies and subtypes
   * with no available DXF on disk. When omitted, every typology/subtype in
   * TYPOLOGIES is shown (legacy behavior).
   */
  plans?: FloorPlanEntry[];
  /** Override the grid column count. Default = one column per typology
   *  (4 across at the desktop default). The mobile landing passes 2 so the
   *  cards stack 2-up on narrow viewports. */
  columns?: number;
};

export default function TypologyPicker({
  selection,
  onChange,
  budget,
  priceIndex,
  currency = "UGX",
  compact = false,
  plans,
  columns,
}: Props) {
  const gap = compact ? 6 : 8;
  const radius = compact ? 12 : 14;
  const tileLabelSize = compact ? 11 : 13;
  const depthSize = compact ? 10 : 11;
  const metaH = compact ? 14 : 16;
  const chipLabelSize = compact ? 12 : 13;
  const eyebrowSize = compact ? 9 : 11;
  const iconW = compact ? 46 : 58;
  const iconH = compact ? 30 : 38;

  // Typologies / subtypes to render. If `plans` is provided, hide anything
  // with no available DXF; otherwise show the full TYPOLOGIES set.
  const typologiesShown: TypologyId[] = plans
    ? availableTypologies(plans)
    : [...TYPOLOGY_ORDER];

  const typAvail = typologyAffordability(priceIndex, currency, budget);
  const activeTyp = TYPOLOGIES[selection.typology];

  // Strip placeholder typology — when the active one has no subtypes (or none
  // available), borrow the first typology that does so the strip keeps its
  // measured height. Falls through to monopitch if nothing is subtyped.
  const firstSubtyped = typologiesShown.find((id) => {
    const t = TYPOLOGIES[id];
    if (!t.subtypes) return false;
    return !plans || availableSubtypes(plans, id).length > 0;
  });
  // Monopitch has no subtypes by design, but the strip is rendered for it
  // too — with a single "Standard" pseudo-chip — so every roof type shows
  // the same green options block on selection (D1, picker consistency).
  const monopitchActive = !activeTyp.subtypes;
  const stripTypology: TypologyId =
    activeTyp.subtypes && (!plans || availableSubtypes(plans, selection.typology).length > 0)
      ? selection.typology
      : monopitchActive
      ? selection.typology
      : (firstSubtyped ?? selection.typology);
  const stripHidden = !monopitchActive && stripTypology !== selection.typology;
  const subAvail = subtypeAffordability(priceIndex, currency, budget, stripTypology);
  const stripDef = TYPOLOGIES[stripTypology];
  const subtypeIdsShown: string[] = monopitchActive
    ? ["__monopitch_standard__"]
    : plans
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
    const cheapest = cheapestAffordableSubtype(priceIndex, currency, budget, id);
    const sub =
      (cheapest && onDisk.includes(cheapest) && cheapest)
      || onDisk[0]
      || Object.keys(typ.subtypes)[0];
    onChange({ typology: id, subtype: sub });
  };

  const selectSubtype = (sub: string) => {
    if (stripHidden) return;
    // Monopitch's synthetic "Standard" chip is a no-op — already selected.
    if (sub === "__monopitch_standard__") return;
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
          gridTemplateColumns: `repeat(${Math.max(columns ?? typologiesShown.length, 1)}, 1fr)`,
          gap,
        }}
      >
        {typologiesShown.map((id) => {
          const typ = TYPOLOGIES[id];
          const active = id === selection.typology;
          const affordable = typAvail[id];
          const disabled = !affordable && !active;
          // The depth is already shown in the docked subtype strip below (every
          // typology, incl. Monopitch's "Standard" pseudo-subtype), so the tile
          // itself carries no depth label — the meta slot only surfaces a lock
          // glyph when the tile is over budget.
          const meta = "";
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
              <img
                src={typ.iconImage}
                alt=""
                aria-hidden="true"
                width={iconW}
                height={iconH}
                style={{
                  display: "block",
                  margin: "0 auto 6px",
                  objectFit: "contain",
                  // Icons are drawn in deep green; on the active (dark) tile
                  // brighten them to white so they read against the background.
                  filter: active ? "brightness(0) invert(1)" : undefined,
                }}
              />
              <div style={{ fontSize: tileLabelSize, fontWeight: 500 }}>{typ.label}</div>
              {/* Fixed-height meta slot — keeps tile heights constant. Shows a
                  lock glyph when the tile is over budget. */}
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
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {disabled ? <LockIcon /> : meta}
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
            // Monopitch carries a single synthetic "Standard" chip so its
            // options block matches the other typologies visually. No real
            // subtype exists in the data model — selection stays `null`.
            const isMonopitchPseudo = monopitchActive && subId === "__monopitch_standard__";
            const sub = isMonopitchPseudo
              ? { label: "Standard" }
              : stripDef.subtypes![subId];
            const active = isMonopitchPseudo
              ? true
              : !stripHidden && subId === selection.subtype;
            const affordable = isMonopitchPseudo ? true : subAvail[subId];
            const disabled = !isMonopitchPseudo && !stripHidden && !affordable;
            const depth = isMonopitchPseudo
              ? depthLabel({ typology: "monopitch", subtype: null })
              : depthLabel({ typology: stripTypology, subtype: subId });
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
                {disabled && (
                  <span style={{ alignSelf: "center", display: "inline-flex" }}>
                    <LockIcon size={11} />
                  </span>
                )}
                <span
                  style={{
                    fontSize: chipLabelSize,
                    fontWeight: active ? 600 : 500,
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

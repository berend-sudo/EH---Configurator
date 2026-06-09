"use client";

type Props = {
  value: number;
  /** Selectable bedroom counts, ascending (e.g. [2, 4] when 1BR/3BR have no
   *  plan). The +/- buttons step through THIS list, so gaps are skipped and
   *  the user can't land on an unavailable count. */
  options: number[];
  onChange: (n: number) => void;
};

export default function BedroomsCounter({ value, options, onChange }: Props) {
  const opts = options.length > 0 ? options : [value];
  // Index of the current value; if it's not in the list (transient, after a
  // typology switch) fall back to the nearest lower option.
  let idx = opts.indexOf(value);
  if (idx === -1) {
    idx = opts.reduce((best, b, i) => (b <= value ? i : best), 0);
  }
  const min = opts[0];
  const max = opts[opts.length - 1];
  const atMin = idx <= 0;
  const atMax = idx >= opts.length - 1;
  const showMaxHint = max < 4;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            color: "var(--eh-text-muted)",
          }}
        >
          Bedrooms
        </span>
        {showMaxHint && (
          <span style={{ fontSize: 11, color: "var(--eh-text-soft)", fontWeight: 500 }}>
            max {max} for this budget
          </span>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <button
          type="button"
          aria-label="Decrease bedrooms"
          disabled={atMin}
          onClick={() => !atMin && onChange(opts[idx - 1])}
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            border: "1.5px solid var(--eh-stroke-strong)",
            background: "#fff",
            fontSize: 20,
            fontWeight: 600,
            color: "var(--eh-text)",
            cursor: atMin ? "not-allowed" : "pointer",
            opacity: atMin ? 0.4 : 1,
            lineHeight: 1,
            font: "inherit",
          }}
        >
          –
        </button>

        <div
          style={{
            minWidth: 90,
            // Fixed height so the column doesn't shrink to fit "Studio"
            // (26 px) vs a numeric value (34 px). Without it the flex row
            // recentres and the +/- buttons appear to jump vertically on
            // every Studio ↔ 1BR toggle.
            height: 50,
            textAlign: "center",
            color: "var(--eh-text)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 2,
          }}
        >
          {value === 0 ? (
            <span style={{ fontSize: 26, fontWeight: 600, letterSpacing: "-0.02em" }}>Studio</span>
          ) : (
            <span style={{ fontSize: 34, fontWeight: 600, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>
              {value}
            </span>
          )}
          <span
            style={{
              fontSize: 10,
              color: "var(--eh-text-soft)",
              letterSpacing: ".06em",
              textTransform: "uppercase",
              fontWeight: 500,
            }}
          >
            {value === 0 ? "no separate bedroom" : value === 1 ? "bedroom" : "bedrooms"}
          </span>
        </div>

        <button
          type="button"
          aria-label="Increase bedrooms"
          disabled={atMax}
          onClick={() => !atMax && onChange(opts[idx + 1])}
          style={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            border: 0,
            background: atMax ? "var(--eh-stroke)" : "var(--eh-green)",
            color: atMax ? "var(--eh-text-soft)" : "var(--eh-green-900)",
            fontSize: 20,
            fontWeight: 600,
            cursor: atMax ? "not-allowed" : "pointer",
            lineHeight: 1,
            font: "inherit",
          }}
        >
          +
        </button>
      </div>
    </div>
  );
}
